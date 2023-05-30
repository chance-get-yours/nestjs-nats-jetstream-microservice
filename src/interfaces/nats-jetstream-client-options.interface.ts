import { ModuleMetadata } from '@nestjs/common';
import { ConnectionOptions, JetStreamOptions } from 'nats';

export interface NatsJetStreamClientOptions {
  connectionOptions: Partial<ConnectionOptions>;
  jetStreamOption?: Partial<JetStreamOptions>;
}
