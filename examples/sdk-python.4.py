from blockchain0x import webhooks


def receive_webhook(req, raw_body, secret):
    result = webhooks.verify(headers=req.headers, raw_body=raw_body, secret=secret)
    if not result.ok:
        return {"code": result.code}, 400
    # result.event_type / result.event_id / result.delivery_id are populated
    return process_event(raw_body, result.event_type)
