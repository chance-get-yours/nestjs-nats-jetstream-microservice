# NATS JetStream Custom Transporter for NestJS microservice
## Goals of this library
- Cover all NATS [JetStream features](https://docs.nats.io/nats-concepts/jetstream).
- Enjoy NestJS [interceptors](https://docs.nestjs.com/microservices/interceptors), [exceptions filters](https://docs.nestjs.com/microservices/exception-filters), [pipes](https://docs.nestjs.com/microservices/pipes), [guards](https://docs.nestjs.com/microservices/guards) .
- If NestJS transporter doesn't fit NATS JetStream needs, [NATS is preferred](https://github.com/nats-io/nats.deno/blob/fd397655e390b36cd52119ec80ce3446f54cb614/examples/jetstream/js_readme_publish_examples.ts).
- Doesn't cover [NATS microservice](https://docs.nestjs.com/microservices/nats) features

## Install
### Library
```bash
npm i @nestjs/microservices
npm i nats
npm i @chance/nestjs-nats-jetstream-microservice
```
### Server
NATS server could run locally
```bash
docker run -d --name nats -p 4222:4222 -p 6222:6222 -p 8222:8222 nats --jetstream -m 8222
```
or using [Synadia NGS](https://www.synadia.com/ngs) for quick setup.
### Cli
[NATS cli](https://docs.nats.io/running-a-nats-service/clients) covers all needs from the command line

```bash
brew tap nats-io/nats-tools
brew install nats-io/nats-tools/nats
```
Or download [official release](https://github.com/nats-io/natscli/releases/).

## Configuration
### Streams
> Streams are 'message stores', each stream defines how messages are stored and what the limits (duration, size, interest) of the retention are. Streams consume normal NATS subjects, any message published on those subjects will be captured in the defined storage system. You can do a normal publish to the subject for unacknowledged delivery, though it's better to use the JetStream publish calls instead as the JetStream server will reply with an acknowledgement that it was successfully stored.

Subjects can be queried using [NATS syntax](https://docs.nats.io/nats-concepts/subjects)

[Configurations options](https://docs.nats.io/nats-concepts/jetstream/streams) could be set using the library 

```typescript
const bootstrap = async () => {
  const options: CustomStrategy = {
    strategy: new NatsJetStreamServer({
      connectionOptions: {
        servers: "127.0.0.1:4222",
        // Name the client for connection hostname to avoid overlap
        name: `nats-connection.${os.hostname()}`,
      },
      // Stream will be created if not exist
      // To work we need all this stream to be available
      assertStreams: [
        {
          name: "booking",
          description: "Booking domain with all its events",
          subjects: ["booking.>"],
        } as Partial<StreamConfig>
      ],
    }),
  };

  // hybrid microservice and web application
  const app = await NestFactory.create<NestFastifyApplication>(HotelBookingModule);
  const microService = app.connectMicroservice(options);
  await microService.listen();
  return app;
};
bootstrap();

```

### Consumer options

> A consumer is a stateful view of a stream. It acts as interface for clients to consume a subset of messages stored in a stream and will keep track of which messages were delivered and acknowledged by clients.
> Unlike with core NATS which provides an at most once delivery guarantee of a message, a consumer can provide an at least once delivery guarantee.

[Configuration options](https://docs.nats.io/nats-concepts/jetstream/consumers) could be set using library and the decorator. Or be set using the cli and using the named consumer with the decorator

```typescript
@Controller()
export class BotNatsController {
  constructor(private scheduleCleaning: ScheduleCleaningCommandHandler) {}

  // Consumer will be created if not exists
  // Updated if exists
  @EventPattern("ConsumerName", {
    description: "Trigger cleaning side effect when room is booked",
    filter_subject: "booking.*.room-booked-event.>",
    deliver_to: "cleanupInbox",
    durable: "cleanupStack",
    manual_ack: true,
  } as ConsumeOptions)
  async cleanup(
    @Payload() event: RoomBookedEvent,
    @Ctx() context: NatsJetStreamContext
  ) {
    // DO the work
    context.message.ack();
  }
}

```

### Publishing events
```typescript
@Module({
  imports: [
    NatsJetStreamTransport.register({
      connectionOptions: {
      servers: "127.0.0.1:4222",
      name: "hotel-booking-publisher",
    }})
  ],
  controllers: [BotNatsController,],
  providers: [],
})
export class HotelBookingModule {}
```

```typescript
@Injectable()
export class BookRoomCommandHandler {
  constructor(private client: NatsJetStreamClient) {}
  async handle(command: BookRoomCommand) {
    // CloudEvent like syntax here, but nothing's mandatory
    const event = new RoomBookedEvent(
      { ...command.data, date: isoDate.toISOString() },
      source,
      correlationId
    );
    const uniqueBookingSlug = `booked-${correlationId}`;
    this.client
      .publish(
        'my.super.subject',
        event,
        // deduplication trick : booking slug is unique using message ID
        // dupe-window should be configured on stream, default 2mn
        { msgID: uniqueBookingSlug }
      )
      .then((res: PubAck) => {
        if (!res.duplicate) {
          return res;
        }
        throw new ConflictException('MsgID already exists error');
      });
  }
}
```