import { Injectable, Inject } from "@nestjs/common";
import { NatsConnection, connect } from "nats";
import { NATS_JETSTREAM_OPTIONS } from "./constants";
import { NatsJetStreamClientOptions } from "./interfaces/nats-jetstream-client-options.interface";

@Injectable()
export class NatsJetStreamTransportConnection {
  private nc: NatsConnection;

  constructor(
    @Inject(NATS_JETSTREAM_OPTIONS) private options: NatsJetStreamClientOptions
  ) {
    this.assertConnection();
  }
  public async assertConnection(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(this.options.connectionOptions);
    }

    return this.nc;
  }
  async close(): Promise<void> {
    const nc = await this.assertConnection();
    await nc.drain();
    await nc.close();
    this.nc = undefined;
  }
}
