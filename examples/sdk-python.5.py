from blockchain0x import ApiKeyError


def safe_list(client):
    try:
        return client.api_keys.list()
    except ApiKeyError as e:
        if e.code == "apikey.scope_insufficient":
            return None  # mint a fresh key with more scope
        raise
