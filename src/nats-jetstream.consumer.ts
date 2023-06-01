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
} from "nats";
import { NatsJetStreamContext } from "./nats-jetstream.context";
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
    this.nc = new NatsJetStreamConnection(this.options).nc;
  }
  async listen(callback: () => null) {
    this.jsm = await this.nc.jetstreamManager(this.options.jetStreamOptions);
    if (this.options.assertStreams) {
      for (const streamConfig of this.options.assertStreams) {
        await this.assertStream(streamConfig as StreamConfig);
      }
    }
    await this.bindEventHandlers();
    callback();
  }

  async close() {
    this.subscriptions.forEach((sub) => sub.close());
  }
  private async bindEventHandlers() {
    const eventHandlers = [...this.messageHandlers.entries()].filter(
      ([, handler]) => handler.isEventHandler
    );

    for (const [consumerName, eventHandler] of eventHandlers) {
      const subscription = await this.subsribeConsumer(
        eventHandler,
        consumerName,
        eventHandler.extras.stream_name as string,
        eventHandler.extras as ConsumeOptions
      );
      this.subscriptions.push(subscription);
    }
  }
  private async subsribeConsumer(
    eventHandler: Function,
    consumerName: string,
    streamName: string,
    consumerOptions?: ConsumeOptions
  ) {
    const js = this.nc.jetstream(this.options.jetStreamOptions);
    this.logger.log(
      `Subscribed to events of stream ${streamName} with ${consumerName} consumer `
    );

    const consumer = await js.consumers.get(streamName, consumerName);
    const subscription = await consumer.consume(consumerOptions);

    for await (const msg of subscription) {
      this.handleMessage(msg, eventHandler);
    }
    return subscription;
  }
  private handleMessage(msg: JsMsg, eventHandler: Function) {
    const data = this.codec.decode(msg.data);
    const context = new NatsJetStreamContext([msg]);
    this.send(from(eventHandler(data, context)), () => null);
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
