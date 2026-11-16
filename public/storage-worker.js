import { createRepository } from "./storage-core.js";
const repository = createRepository(indexedDB);
// Les messages sont séquencés : un changement de projet ne peut pas être
// écrasé par la fin tardive d'une sauvegarde du projet précédent.
let queue = Promise.resolve();
self.onmessage = ({ data: { id, method, payload } }) => {
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        let result;
        if (method === "encode")
          result = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          });
        else if (method === "parse") result = JSON.parse(payload);
        else if (method === "write") result = await repository.write(payload);
        else if (method === "putAsset")
          result = await repository.putAsset(payload.key, payload.blob);
        else if (method === "getAsset")
          result = await repository.getAsset(payload);
        else if (method === "load") result = await repository.load();
        else throw new Error("Opération de stockage inconnue.");
        self.postMessage({ id, result });
      } catch (error) {
        self.postMessage({
          id,
          error: { name: error.name, message: error.message },
        });
      }
    });
};
