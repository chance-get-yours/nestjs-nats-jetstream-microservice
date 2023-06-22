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
import { Injectable } from '@nestjs/common';

@Injectable()
export class NatsJetStreamConsumer
  extends Server
  implements CustomTransportStrategy
{
  private nc: NatsConnection;
  private codec = JSONCodec();
  private jsm: JetStreamManager;
  private subscriptions: ConsumerMessages[];

  constructor(private options: NatsJetStreamClientOptions) {
    super();
  }

  async listen(callback: () => null) {
    const cnx = new NatsJetStreamConnection(this.options);
    this.nc = await cnx.assertConnection();
    this.jsm = await this.nc.jetstreamManager(this.options.jetStreamOptions)
    await this.bindEventHandlers();
    callback();
  }

  async close() {
    this.subscriptions.forEach((sub) => sub.close());
  }
  private async bindEventHandlers()  {
    const eventHandlers = [...this.messageHandlers.entries()]

    for (const [consumerName, eventHandler] of eventHandlers) {
      const subscription = await this.subsribeConsumer(
        eventHandler,
        consumerName,
        eventHandler.extras.streamName as string,
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
