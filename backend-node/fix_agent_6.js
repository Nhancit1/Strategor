import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const AgentExecutionSchema = new mongoose.Schema({
  project: mongoose.Schema.Types.ObjectId,
  agentId: Number,
  output: mongoose.Schema.Types.Mixed,
  editedOutput: mongoose.Schema.Types.Mixed,
  status: String
}, { strict: false });

const AgentExecution = mongoose.model('AgentExecution', AgentExecutionSchema);

async function run() {
  try {
    console.log("Connexion à MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    const projectId = "6a2aeb23bd9ec8ad75c11cd0";
    console.log("Mise à jour de l'Agent 6 pour le projet", projectId);

    const newOutput = {
      "strategic_axes": [
        {
          "title": "STANDARDISATION PRODUIT",
          "description": "Résoudre le paradoxe scalabilité/customisation en transformant radicalement le modèle de delivery. Objectif : passer de 60-70% customisation à 80% standard / 20% configuration sous 18 mois.",
          "initiatives": [
            "Auditer les customisations actuelles pour identifier le tronc commun.",
            "Refondre l'architecture produit pour la rendre modulaire.",
            "Adapter le modèle de tarification (value-based)."
          ],
          "quick_wins": [
            "Mettre en pause les développements spécifiques non critiques.",
            "Lancer un audit technique des customisations (war room)."
          ],
          "milestones": [
            { "quarter": "Q1 2025", "milestone": "Audit terminé et nouvelle architecture validée" },
            { "quarter": "Q3 2025", "milestone": "Déploiement de la version 80% standard" }
          ],
          "resources": ["Équipe R&D dédiée à la standardisation", "Budget de refonte technique"]
        },
        {
          "title": "ACCÉLÉRATION COMMERCIALE MID-MARKET",
          "description": "Diversifier le portefeuille client en ciblant les ETI (500-2000 salariés) avec une offre pré-packagée à cycle de vente court.",
          "initiatives": [
            "Créer une offre 'plug-and-play' pour les ETI.",
            "Structurer le marketing et les ventes pour un cycle court (3-6 mois)."
          ],
          "quick_wins": [
            "Identifier 10 ETI dans le pipeline existant.",
            "Préparer un pitch deck spécifique mid-market."
          ],
          "milestones": [
            { "quarter": "Q1 2025", "milestone": "Lancement officiel de l'offre ETI" },
            { "quarter": "Q4 2025", "milestone": "Acquisition de 20 nouveaux clients ETI" }
          ],
          "resources": ["Équipe commerciale mid-market", "Budget marketing digital"]
        },
        {
          "title": "RENFORCEMENT CAPACITÉS R&D/IA",
          "description": "Sécuriser les talents critiques et structurer la roadmap pour tenir simultanément maintenance produit + nouveau module IA.",
          "initiatives": [
            "Lancer une campagne de recrutement massive pour la R&D.",
            "Sécuriser les talents IA actuels avec un plan de rétention."
          ],
          "quick_wins": [
            "Lancer les offres d'emploi pour profils ML/IA.",
            "Identifier des partenaires de recrutement spécialisés."
          ],
          "milestones": [
            { "quarter": "Q1 2025", "milestone": "Recrutement de 10 nouveaux profils R&D" },
            { "quarter": "Q3 2025", "milestone": "Lancement de la version beta du nouveau module IA" }
          ],
          "resources": ["Budget recrutement important", "Fonds de série B attendus"]
        },
        {
          "title": "PARTENARIATS STRATÉGIQUES & CONFORMITÉ",
          "description": "Neutraliser la menace des hyperscalers via partenariats OEM/co-selling, et anticiper les obligations réglementaires IA Act + CSRD.",
          "initiatives": [
            "Initier des discussions avec des ERP tier-1 (SAP, Oracle).",
            "Lancer un chantier de mise en conformité CSRD/IA Act."
          ],
          "quick_wins": [
            "Nommer un responsable conformité IA interne.",
            "Cartographier les partenaires ERP potentiels."
          ],
          "milestones": [
            { "quarter": "Q2 2025", "milestone": "Conformité CSRD atteinte" },
            { "quarter": "Q4 2025", "milestone": "Signature d'un premier partenariat stratégique" }
          ],
          "resources": ["Budget compliance juridique", "Ressources Business Development"]
        }
      ]
    };

    const updated = await AgentExecution.findOneAndUpdate(
      { project: new mongoose.Types.ObjectId(projectId), agentId: 6 },
      { $set: { status: 'DONE', output: newOutput, editedOutput: null } },
      { new: true }
    );

    if (updated) {
      console.log("SUCCÈS ! L'Agent 6 a été mis à jour avec les données formatées.");
    } else {
      console.log("ERREUR : Exécution de l'Agent 6 non trouvée !");
    }

    process.exit(0);
  } catch (e) {
    console.error("Erreur lors de la mise à jour :", e);
    process.exit(1);
  }
}

run();
