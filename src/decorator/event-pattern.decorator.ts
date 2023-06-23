import { EventPattern as OriginalEventPattern } from "@nestjs/microservices";
import { NatsJetStreamConsumerOptions } from "src/interfaces/nats-jetstream-consumer-options.interface";

/**
 * FIXME can it work ?
 */
export const EventPattern = (
  metadata: any,
  transportOrExtras?: NatsJetStreamConsumerOptions
) => {
  return OriginalEventPattern(metadata, transportOrExtras);
};
