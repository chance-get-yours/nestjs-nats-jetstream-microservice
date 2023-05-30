import { EventPattern as OriginalEventPattern } from '@nestjs/microservices';
import { NatsJetStreamConsumerOptions } from '../interfaces/nats-jetstream-consumer-options.interface';

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 */
export const EventPattern = (
  metadata: any,
  transportOrExtras?: NatsJetStreamConsumerOptions,
) => {
  return OriginalEventPattern(metadata, transportOrExtras);
};
