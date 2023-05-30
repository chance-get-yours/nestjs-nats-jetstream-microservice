export interface NatsJetStreamConsumerOptions {
  // https://nats.io/blog/jetstream-java-client-03-consume/
  // https://docs.nats.io/nats-concepts/jetstream/consumers

  // Subject pattern or exact name to subscribe to
  subject: string;
  // Bind to given named stream, if not set  try to guess automatically
  streamName?: string;
  // Durable subscriptions remember their position even if the client is disconnected.
  durable?: string;
  //  Specify where in the stream it wants to start receiving messages.
  deliverPolicy?:
    | 'All'
    | 'Last'
    | 'New'
    | 'ByStartSequence'
    | 'ByStartTime'
    | 'last_per_subject';
  // If deliveryPolicy is set to ByStartSequence this will specify the sequence number to start on.
  startSequence?: number;
  // If deliveryPolicy is set to ByStartTime this will specify a delta time in the stream at which to start.
  startAtTimeDelta?: number;
  // If deliveryPolicy is set to ByStartTime this will specify the time in the stream at which to start. It will receive the closest available message on or after that time
  startTime?: Date;
  // Creates a unique delivery_subject prefix with this.
  deliverTo?: string;
  // The subject to deliver observed messages. Not allowed for pull subscriptions. Deliver subject is required for queue subscribing as it configures a subject that all the queue consumers should listen on.
  deliverToSubject?: string;
  // How messages should be acknowledged. If an ack is required but is not received within the AckWait window, the message will be redelivered. Excplicit is the only allowed option for pull consumers.
  ackPolicy?: 'Explicit' | 'All' | 'None';
  // (default: 30000 ) - the time in nanoseconds that the server will wait for an ack for any individual message. If an ack is not received in time, the message will be redelivered.
  ackWait?: number;
  // (default: 1024) - The maximum number of messages the subscription will receive without sending back ACKs.
  maxAckPending?: number;
  //  (default: Instant) - The replay policy applies when the deliver policy is `All`, `ByStartSequence` or `ByStartTime` since those deliver policies begin reading the stream at a position other than the end. If the policy is `Original`, the messages in the stream will be pushed to the client at the same rate they were originally received, simulating the original timing of messages. If the policy is `Instant` (the default), the messages will be pushed to the client as fast as possible while adhering to the Ack Policy, Max Ack Pending and the client’s ability to consume those messages.
  replayPolicy?:
    | 'Instant'
    | 'All'
    | 'ByStartSequence'
    | 'ByStartTime'
    | 'Original';
  // The maximum number of times a specific message will be delivered. Applies to any message that is re-sent due to ack policy.
  maxDeliver?: number;
  // When consuming from a stream with a wildcard subject, the Filter Subject allows you to select a subset of the full wildcard subject to receive messages from.
  filterSubject?: string;
  // Sets the percentage of acknowledgements that should be sampled for observability, 0-100
  sample?: number;
  // If the idle heartbeat period is set, the server will send a status message to the client when the period has elapsed but it has not received any new messages. This lets the client know that it’s still there, but just isn’t receiving messages.
  idleHeartbeat?: number;
  // Flow control is another way for the consumer to manage back pressure. Instead of relying on the rate limit, it relies on the pending limits of max messages and/or max bytes. If the server sends the number of messages or bytes without receiving an ack, it will send a status message letting you know it has reached this limit. Once flow control is tripped, the server will not start sending messages again until the client tells the server, even if all messages have been acknowledged.
  flowControl?: boolean;
  // is the number of outstanding pulls that are allowed on any one consumer. Pulls made that exceeds this limit are discarded.
  maxWaiting?: number;
  //
  maxMessages?: number;
  // each individual message must be acknowledged.
  manualAck?: boolean;
  //  Used to throttle the delivery of messages to the consumer, in bits per second.
  limit?: number;
  // Consumer description
  description?: string;
  // a specialized push consumer that puts together flow control, heartbeats, and additional logic to handle message gaps. Ordered consumers cannot operate on a queue and cannot be durable.
  orderedConsumer?: boolean;
  // when set will only deliver messages to subscriptions matching that group.
  deliverGroup?: string;
  // configures the consumer to only deliver existing header and the `Nats-Msg-Size` header, no bodies.
  headersOnly?: boolean;
}
