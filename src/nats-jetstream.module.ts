import { DynamicModule, Module } from "@nestjs/common";
import {
  NATS_JETSTREAM_OPTIONS,
  NatsJetStreamClientOptions,
} from "./interfaces/nats-jetstream-client-options.interface";
import { NatsJetStreamClient } from "./nats-jetstream.client";
import { NatsJetStreamConnection } from "./nats-jetstream.connection";
import { NatsJetStreamManager } from "./nats-jetstream.manager";

// noinspection JSUnusedGlobalSymbols

export class NatsJetStreamModule {
  static register(options: NatsJetStreamClientOptions): DynamicModule {
    const providers = [
      {
        provide: NATS_JETSTREAM_OPTIONS,
        useValue: options,
      },
      NatsJetStreamConnection,
      NatsJetStreamClient,
      NatsJetStreamManager,
    ];

    return {
      providers,
      exports: providers,
      module: NatsJetStreamModule,
    };
  }
}
