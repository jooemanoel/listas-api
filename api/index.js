// Ponto de entrada da função serverless na Vercel.
import { criarApp } from "../src/app.js";
import { lerConfig } from "../src/config.js";
import { criarRepositorioFirestore } from "../src/repositorios/firestore.js";

export default criarApp({ repo: criarRepositorioFirestore(), config: lerConfig() });
