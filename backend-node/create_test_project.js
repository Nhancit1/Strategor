import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: './.env' });

import { User } from './src/models/User.js';
import { Project } from './src/models/Project.js';
import { OnboardingProfile } from './src/models/OnboardingProfile.js';
import { FinanceLite } from './src/models/FinanceLite.js';
import { startAnalysis } from './src/services/pythonClient.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find the current user or admin
    const user = await User.findOne({ deletedAt: null }).sort({ createdAt: 1 });
    if (!user) {
      console.error("No user found in the database. Create one first.");
      process.exit(1);
    }
    
    console.log(`Creating test project for user: ${user.email}`);
    
    // 1. Create a Project
    const project = await Project.create({
      owner: user._id,
      name: 'Projet Test Ultime (All Agents)',
      analysisMode: 'comprehensive',
      status: 'ONBOARDING',
      language: 'fr',
      currentStep: 'finance'
    });
    
    // 2. Create rich OnboardingProfile
    await OnboardingProfile.create({
      project: project._id,
      companyName: 'TechNova Solutions',
      userRole: 'CEO',
      sectors: ['Technologie', 'SaaS', 'B2B'],
      territories: ['Europe', 'Amérique du Nord'],
      marketTypes: ['B2B'],
      objectives: ['Croissance', 'Rentabilité', 'Internationalisation'],
      stage: 'SCALE_UP',
      revenueRange: '10M - 50M',
      teamSize: '50 - 200',
      territoryDetail: 'Forte présence en France, début d\'expansion au Canada.',
      customerDescription: 'Grands comptes et ETI dans le secteur de la finance et de la logistique.',
      objectiveDetail: 'Nous voulons doubler notre ARR d\'ici 3 ans et lancer un nouveau module IA.',
      startingPoint: 'structure',
      activityPrecise: 'Éditeur de logiciel SaaS B2B spécialisé dans l\'optimisation logistique par IA.',
      positioning: 'Premium, hautement personnalisable, orienté ROI rapide.',
      valueScope: 'Développement logiciel, intégration client, support technique.',
      strengths: 'Technologie IA propriétaire, base de clients fidèles, équipe experte.',
      weaknesses: 'Cycle de vente très long, dépendance à 3 clients majeurs, manque de notoriété aux US.',
      portfolio: [
        { name: 'SaaS Logistique Core', revenueShare: 70, growth: 15, marketShare: 20 },
        { name: 'Module Prédictif IA', revenueShare: 30, growth: 60, marketShare: 5 }
      ]
    });
    
    // 3. Create rich FinanceLite
    await FinanceLite.create({
      project: project._id,
      data: {
        chiffre_affaires: 15000000,
        croissance_ca: "20%",
        marge_ebitda: "12%",
        tresorerie: 3000000,
        endettement: "Faible",
        cout_acquisition_client: 5000,
        valeur_vie_client: 50000,
        burn_rate: "N/A - Cashflow positif",
        investissements_r_et_d: "15% du CA"
      },
      completenessScore: 100
    });
    
    project.status = 'ANALYZING';
    await project.save();
    
    // 4. Trigger Analysis
    console.log("Triggering analysis pipeline (phase: profile)...");
    startAnalysis({
      projectId: project.id.toString(),
      mode: project.analysisMode || 'comprehensive',
      language: project.language || 'fr',
      phase: 'profile'
    }).catch(err => {
      console.error("Python handoff failed, but project was created:", err.message);
    });
    
    console.log(`\n✅ Projet Test Ultime créé avec succès !`);
    console.log(`ID du projet: ${project._id}`);
    console.log(`Veuillez vous rendre sur http://localhost:5173/dashboard pour suivre l'analyse.`);
    
    // Wait a brief moment to let startAnalysis fire
    setTimeout(() => {
      process.exit(0);
    }, 2000);
    
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
