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
export class NatsJetStreamManager {
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
