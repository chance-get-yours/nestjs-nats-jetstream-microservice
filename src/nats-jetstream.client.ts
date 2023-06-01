import { Injectable, Inject } from "@nestjs/common";
import {
  Codec,
  ConsumerAPI,
  JetStreamClient,
  JetStreamManager,
  JetStreamPublishOptions,
  JSONCodec,
  KV,
  KvOptions,
  NatsConnection,
  PubAck,
  StreamAPI,
} from "nats";
import {
  NatsJetStreamClientOptions,
  NATS_JETSTREAM_OPTIONS,
} from "./interfaces/nats-jetstream-client-options.interface";
import { NatsJetStreamConnection } from "./nats-jetstream.connection";

@Injectable()
export class NatsJetStreamClient {
  private jsm: JetStreamManager;
  private codec: Codec<JSON>;
  private nc: NatsConnection;

  constructor(
    natsConnection: NatsJetStreamConnection,
    @Inject(NATS_JETSTREAM_OPTIONS) private options: NatsJetStreamClientOptions
  ) {
    this.codec = JSONCodec();
    this.nc = natsConnection.nc;
  }
  async publish<JSON>(
    pattern: any,
    event: any,
    publishOptions?: Partial<JetStreamPublishOptions>
  ): Promise<PubAck> {
    const payload = this.codec.encode(event);
    return this.jetStream().then((js) =>
      js.publish(pattern, payload, publishOptions)
    );
  }
  async jetStream(): Promise<JetStreamClient> {
    return this.nc.jetstream(this.options.jetStreamOptions);
  }
  async assertBucket(
    bucket: string,
    options?: Partial<KvOptions>
  ): Promise<KV> {
    return this.jetStream().then((js) => js.views.kv(bucket, options));
  }
  private async assertJetStreamManager() {
    if (!this.jsm) {
      this.jsm = await this.nc.jetstreamManager(this.options.jetStreamOptions);
    }
    return this.jsm;
  }
  async streams(): Promise<StreamAPI> {
    return this.assertJetStreamManager().then((jsm) => jsm.streams);
  }
  async consumers(): Promise<ConsumerAPI> {
    return this.assertJetStreamManager().then((jsm) => jsm.consumers);
  }
}
