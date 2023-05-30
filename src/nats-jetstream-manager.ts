import { Injectable, Inject } from "@nestjs/common";
import {
  ConsumerAPI,
  JetStreamManager,
  StreamAPI,
} from "nats/lib/nats-base-client/types";
import { NATS_JETSTREAM_OPTIONS } from "./constants";
import { NatsJetStreamClientOptions } from "./interfaces/nats-jetstream-client-options.interface";
import { NatsJetStreamTransportConnection } from "./nats-jetstream-transport.connection";

@Injectable()
export class NatsJetStreamManager {
  private jsm: JetStreamManager;

  constructor(
    private nc: NatsJetStreamTransportConnection,
    @Inject(NATS_JETSTREAM_OPTIONS) private options: NatsJetStreamClientOptions
  ) {}
  private async assertJetStreamManager() {
    if (!this.jsm) {
      const nc = await this.nc.assertConnection();
      this.jsm = await nc.jetstreamManager(this.options.jetStreamOption);
    }
    return this.jsm;
  }
  async streams(): Promise<StreamAPI> {
    return (await this.assertJetStreamManager()).streams;
  }
  async consumers(): Promise<ConsumerAPI> {
    return (await this.assertJetStreamManager()).consumers;
  }
}
