import { ConnectionOptions, JetStreamOptions, StreamConfig } from "nats";

export const NATS_JETSTREAM_OPTIONS = "NATS_JETSTREAM_OPTIONS";

export interface NatsJetStreamClientOptions {
  connectionOptions: Partial<ConnectionOptions>;
  jetStreamOptions?: Partial<JetStreamOptions>;
  assertStreams?: Partial<StreamConfig>[];
}
