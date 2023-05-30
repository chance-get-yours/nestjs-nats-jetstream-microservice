import { Injectable } from '@nestjs/common';
import { Codec, JSONCodec } from 'nats';
import { KV, KvOptions } from 'nats/lib/nats-base-client/types';
import { NatsJetStreamTransportConnection } from './nats-jetstream-transport.connection';

@Injectable()
// https://github.com/nats-io/nats.deno/blob/main/jetstream.md#kv
export class NatsJetStreamKeyStore {
  private codec: Codec<JSON>;

  constructor(private nc: NatsJetStreamTransportConnection) {
    this.codec = JSONCodec();
  }
  async assertBucket(
    bucket: string,
    options?: Partial<KvOptions>,
  ): Promise<KV> {
    const nc = await this.nc.assertConnection();
    return await nc.jetstream().views.kv(bucket, options);
  }
}
