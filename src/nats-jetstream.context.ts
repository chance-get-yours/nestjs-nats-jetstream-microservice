import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import { JsMsg } from "nats";
import {
  Expires,
  ExportedConsumer,
  FetchOptions,
  NextOptions,
} from "nats/lib/nats-base-client/types";

export type NatsJetStreamContextArgs = [JsMsg];

export class NatsJetStreamConsumeContext extends BaseRpcContext<NatsJetStreamContextArgs> {
  constructor(args: NatsJetStreamContextArgs) {
    super(args);
  }
  ack() {
    this.message.ack();
  }
  nack() {
    this.message.nak();
  }
  get message(): JsMsg {
    return this.args[0];
  }
}
export class NatsJetStreamNextContext extends NatsJetStreamConsumeContext {
  constructor(
    args: NatsJetStreamContextArgs,
    private consumer: ExportedConsumer
  ) {
    super(args);
  }
  fetch(opts: NextOptions) {
    this.consumer.next(opts);
  }
  get message(): JsMsg {
    return this.args[0];
  }
}
export class NatsJetStreamWatchContext extends BaseRpcContext<NatsJetStreamContextArgs> {
  constructor(args: NatsJetStreamContextArgs) {
    super(args);
  }
  get message(): JsMsg {
    return this.args[0];
  }
}
