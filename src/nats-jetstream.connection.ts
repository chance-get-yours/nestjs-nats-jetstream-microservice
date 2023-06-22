import { Injectable, Inject } from "@nestjs/common";
import { NatsConnection, connect } from "nats";
import {
  NatsJetStreamClientOptions,
  NATS_JETSTREAM_OPTIONS,
} from "./interfaces/nats-jetstream-client-options.interface";

@Injectable()
export class NatsJetStreamConnection {
  public nc: NatsConnection;

  constructor(
    @Inject(NATS_JETSTREAM_OPTIONS) private options: NatsJetStreamClientOptions
  ) {
  }
  public async assertConnection(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(this.options.connectionOptions);
    }

    return this.nc;
  }
  async close(): Promise<void> {
    // FIXME does not works
    if (!this.nc) {
      return;
    }
    await this.nc.drain();
    await this.nc.close();
    this.nc = undefined;
  }
}
