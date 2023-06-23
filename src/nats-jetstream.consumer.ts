import { CustomTransportStrategy, Server } from "@nestjs/microservices";
import {
  Codec,
  NatsConnection,
  JSONCodec,
  JetStreamManager,
  StreamConfig,
  ConsumeOptions,
  JsMsg,
  ConsumerMessages,
  ConsumerOpts,
  connect,
  FetchOptions,
} from "nats";
import { NatsJetStreamConsumeContext } from "./nats-jetstream.context";
import { from } from "rxjs";
import { NatsJetStreamClientOptions } from "./interfaces/nats-jetstream-client-options.interface";
import { NatsJetStreamConnection } from "./nats-jetstream.connection";

export class NatsJetStreamConsumer
  extends Server
  implements CustomTransportStrategy
{
  private nc: NatsConnection;
  private codec: Codec<JSON>;
  private jsm: JetStreamManager;
  private subscriptions: ConsumerMessages[];

  constructor(private options: NatsJetStreamClientOptions) {
    super();
    this.codec = JSONCodec();
  }
  async listen(callback: () => null) {
    this.nc = await connect(this.options.connectionOptions);
    this.jsm = await this.nc.jetstreamManager(this.options.jetStreamOptions);
    if (this.options.assertStreams) {
      for (const streamConfig of this.options.assertStreams) {
        await this.assertStream(streamConfig as StreamConfig);
      }
    }
    if (this.options.assertConsumers) {
      for (const consumerConfig of this.options.assertConsumers) {
        await this.assertConsumer(
          consumerConfig.streamName,
          consumerConfig.consumerName,
          consumerConfig.consumerOptions
        );
      }
    }
    await this.bindEventHandlers();
    callback();
  }

  close() {
    this.subscriptions.forEach((sub) => sub.stop());
    this.nc.close();
    this.nc.drain();
  }
  private async bindEventHandlers() {
    const eventHandlers = [...this.messageHandlers.entries()].filter(
      ([, handler]) => handler.isEventHandler
    );

    for (const [eventPattern, eventHandler] of eventHandlers) {
      await this.consumeSubscription(
        eventHandler,
        eventPattern,
        eventHandler.extras
      );
    }
  }
  private async consumeSubscription(
    eventHandler: Function,
    eventPattern: string,
    options: ConsumeOptions | FetchOptions
  ) {
    const [streamName, consumerName] = eventPattern.split(":");
    this.logger.log(
      `Consume events on stream ${streamName} with ${consumerName} consumer `
    );
    const js = this.nc.jetstream(this.options.jetStreamOptions);
    const consumer = await js.consumers.get(streamName, consumerName);

    const sub = await consumer.consume(options);
    this.subscriptions.push(sub);

    for await (const msg of sub) {
      const data = this.codec.decode(msg.data);
      const context = new NatsJetStreamConsumeContext([msg]);
      this.send(from(eventHandler(data, context)), () => null);
    }
  }

  private async assertConsumer(
    streamName: string,
    consumerName: string,
    options: Partial<ConsumerOpts>
  ) {
    this.logger.log(
      `Assert consumer named ${consumerName} on stream ${streamName} `
    );

    const consumers = await this.jsm.consumers.list(streamName).next();
    const consumer = consumers.find(
      (consumer) => consumer.name === consumerName
    );
    if (!consumer) {
      await this.jsm.consumers.add(streamName, options);
    }
  }
  private async assertStream(streamConfig: StreamConfig) {
    const streams = await this.jsm.streams
      .list(streamConfig.subjects[0])
      .next();
    const stream = streams.find(
      (stream) => stream.config.name === streamConfig.name
    );

    if (stream) {
      const streamInfo = await this.jsm.streams.update(stream.config.name, {
        ...stream.config,
        ...streamConfig,
      });
      this.logger.log(`Stream ${streamInfo.config.name} updated`);
    } else {
      const streamInfo = await this.jsm.streams.add(streamConfig);
      this.logger.log(`Stream ${streamInfo.config.name} created`);
    }
  }
}
