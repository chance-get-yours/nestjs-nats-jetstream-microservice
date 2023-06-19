import { Injectable, Inject } from "@nestjs/common";
import {
  Codec,
  JetStreamClient,
  JetStreamPublishOptions,
  JSONCodec,
  KV,
  KvOptions,
  NatsConnection,
  PubAck,
} from "nats";
import {
  NatsJetStreamClientOptions,
  NATS_JETSTREAM_OPTIONS,
} from "./interfaces/nats-jetstream-client-options.interface";
import { NatsJetStreamConnection } from "./nats-jetstream.connection";

@Injectable()
export class NatsJetStreamClient {
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
  private async jetStream(): Promise<JetStreamClient> {
    return this.nc.jetstream(this.options.jetStreamOptions);
  }
  async assertBucket(
    bucket: string,
    options?: Partial<KvOptions>
  ): Promise<KV> {
    return this.jetStream().then((js) => js.views.kv(bucket, options));
  }
}
