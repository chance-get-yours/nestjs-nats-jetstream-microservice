import {
  ConnectionOptions,
  ConsumerOpts,
  JetStreamOptions,
  StreamConfig,
} from "nats";

export const NATS_JETSTREAM_OPTIONS = "NATS_JETSTREAM_OPTIONS";

export interface NatsJetStreamConsumerConfig {
  streamName: string;
  consumerName: string;
  consumerOptions: Partial<ConsumerOpts>;
}

export interface NatsJetStreamClientOptions {
  connectionOptions: Partial<ConnectionOptions>;
  jetStreamOptions?: Partial<JetStreamOptions>;
  assertConsumers?: NatsJetStreamConsumerConfig[];
  assertStreams?: Partial<StreamConfig>[];
}
