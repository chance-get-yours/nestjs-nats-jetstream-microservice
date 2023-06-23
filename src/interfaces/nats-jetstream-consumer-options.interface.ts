import { ConsumeOptions } from "nats";

export type StreamName = {
  stream_name: string;
};
export type NatsJetStreamConsumerOptions = StreamName & Partial<ConsumeOptions>;
