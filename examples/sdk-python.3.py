def list_keys(client):
    for key in client.api_keys.list()["data"]:
        print(key["id"], key["prefix"])
