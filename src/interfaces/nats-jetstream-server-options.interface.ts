import { ConnectionOptions, JetStreamOptions, StreamConfig } from 'nats';

export interface NatsJetStreamServerOptions {
  connectionOptions: Partial<ConnectionOptions>;
  jetStreamOptions?: Partial<JetStreamOptions>;
  assertStreams?: Partial<StreamConfig>[];
}
