import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import {
  Codec,
  connect,
  NatsConnection,
  JSONCodec,
  JetStreamManager,
  StreamConfig,
} from 'nats';
import { NatsJetStreamContext } from './nats-jetstream.context';
import { serverConsumerOptionsBuilder } from './utils/server-consumer-options-builder';
import { from } from 'rxjs';
import { NatsJetStreamServerOptions } from './interfaces/nats-jetstream-server-options.interface';
import { NatsJetStreamConsumerOptions } from './interfaces/nats-jetstream-consumer-options.interface';

export class NatsJetStreamServer
  extends Server
  implements CustomTransportStrategy
{
  private nc: NatsConnection;
  private codec: Codec<JSON>;
  private jsm: JetStreamManager;

  constructor(private options: NatsJetStreamServerOptions) {
    super();
    this.codec = JSONCodec();
  }
  async listen(callback: () => null) {
    if (!this.nc) {
      this.nc = await connect(this.options.connectionOptions);
    }
    this.jsm = await this.nc.jetstreamManager(this.options.jetStreamOptions);
    if (this.options.assertStreams) {
      for (const streamConfig of this.options.assertStreams) {
        await this.setupStream(streamConfig as StreamConfig);
      }
    }

    await this.bindEventHandlers();
    this.bindMessageHandlers();
    callback();
  }

  async close() {
    await this.nc.drain();
    await this.nc.close();
    this.nc = undefined;
  }
  private async bindEventHandlers() {
    const eventHandlers = [...this.messageHandlers.entries()].filter(
      ([, handler]) => handler.isEventHandler,
    );

    for (const [consumerName, eventHandler] of eventHandlers) {
      let subject: string;
      subject = eventHandler.extras?.subject;
      // FIXME keep sugar here ?
      if (!subject) {
        subject = consumerName;
        const deliverTo = subject
          .replaceAll('.', '_')
          .replaceAll('*', 'ANY')
          .replaceAll('>', 'ALL');

        eventHandler.extras.deliverTo = deliverTo;
        eventHandler.extras.deliverGroup = deliverTo;
        this.logger.warn(
          `Deprecated missing extra set for EventPattern(${consumerName}), use default : transcient push queue`,
        );
      }
      this.subsribeConsumer(
        subject,
        eventHandler,
        consumerName,
        eventHandler.extras as NatsJetStreamConsumerOptions,
      );
    }
  }
  private async subsribeConsumer(
    subject: string,
    eventHandler: Function,
    consumerName: string,
    options?: NatsJetStreamConsumerOptions,
  ) {
    const js = this.nc.jetstream(this.options.jetStreamOptions);
    const consumerOptions = serverConsumerOptionsBuilder(
      options as NatsJetStreamConsumerOptions,
    );

    // https://docs.nats.io/nats-concepts/jetstream/consumers
    // https://github.com/nats-io/nats.deno/blob/main/jetstream.md#push-subscriptions
    // Error: consumer info specifies deliver_subject - pull consumers cannot have deliver_subject set
    this.logger.log(
      `Subscribed to ${subject} events for ${consumerName} consumer `,
    );
    const subscription = await js.subscribe(subject, consumerOptions);

    const done = (async () => {
      for await (const msg of subscription) {
        try {
          const data = this.codec.decode(msg.data);
          const context = new NatsJetStreamContext([msg]);
          this.send(from(eventHandler(data, context)), () => null);
        } catch (err) {
          this.logger.error(err.message, err.stack);
          // specifies that you failed to process the server and instructs
          // the server to not send it again (to any consumer)
          msg.term();
        }
      }
    })();
    done.then(() => {
      subscription.destroy();
      this.logger.log(`Unsubscribed ${subject} for consumer ${consumerName}`);
    });
  }
  // For classic nats message
  private bindMessageHandlers() {
    // const messageHandlers = [...this.messageHandlers.entries()].filter(
    //   ([, handler]) => !handler.isEventHandler,
    // );
    // // FIXME Beurk !
    // this.options.consumers.forEach(async (options: ServerConsumerOptions) => {
    //   const subject = options.subject;
    //   const consumerOptions = serverConsumerOptionsBuilder(options, subject);
    //   // Maps event handler with consumer name
    //   for (const [mappedKey, messageHandler] of messageHandlers) {
    //     const subscriptionOptions: SubscriptionOptions = {
    //       queue: options.deliverTo,
    //       callback: async (err, msg) => {
    //         if (err) {
    //           return this.logger.error(err.message, err.stack);
    //         }
    //         const payload = this.codec.decode(msg.data);
    //         const context = new NatsContext([msg]);
    //         const response$ = this.transformToObservable(
    //           messageHandler(payload, context),
    //         );
    //         this.send(response$, (response) =>
    //           msg.respond(this.codec.encode(response as JSON)),
    //         );
    //       },
    //     };
    //     this.nc.subscribe(subject, subscriptionOptions);
    //     this.logger.log(`Subscribed to ${subject} messages`);
    //   }
    // });
  }

  private async setupStream(streamConfig: StreamConfig) {
    const streams = await this.jsm.streams.list().next();
    const stream = streams.find(
      (stream) => stream.config.name === streamConfig.name,
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
