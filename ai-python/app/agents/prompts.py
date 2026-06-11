"""
Agent missions + output JSON Schemas.
AUTO-EXTRACTED verbatim from the original Spring agent definitions —
do not hand-edit casually; these prompts are the product IP.
"""
import json

MISSIONS: dict[int, str] = {
    1: '''Mission : Synthétise le profil de l'entreprise en un narratif clair (300-500 mots) qui sera réutilisé par les autres agents.
Inclus :
  - Activité principale (1-2 phrases)
  - Clientèle visée
  - Positionnement actuel
  - Atouts initiaux apparents
  - Enjeux principaux exprimés''',
    2: '''Mission : Analyse PESTEL approfondie et CONCRÈTE des facteurs macro-environnementaux.

Pour chacun des 6 axes (Politique, Économique, Socioculturel, Technologique, Environnemental, Légal) :
  - Identifie 2-4 facteurs majeurs et SPÉCIFIQUES au secteur/géographie
  - Indique l'impact (POSITIVE / NEGATIVE / NEUTRAL)
  - Évalue l'intensité (1-5)
  - Précise un horizon temporel (court/moyen/long terme)

Évite les généralités. Cite des éléments concrets (réglementations en cours, tendances chiffrées, etc.).''',
    3: '''Mission : Analyse SWOT INCISIVE de l'entreprise.

Forces et Faiblesses (INTERNE) :
  - Sois honnête sur les faiblesses (ne pas survaloriser)
  - Identifie 4-6 forces clairement différenciantes
  - 3-5 faiblesses critiques à adresser

Opportunités et Menaces (EXTERNE) :
  - Connecte au PESTEL et au contexte sectoriel
  - 4-6 opportunités saisissables sous 18 mois
  - 3-5 menaces concrètes à anticiper

Pour chaque élément : titre + description + priorité (HIGH/MEDIUM/LOW).

Termine par 4-6 actions stratégiques TOWS (Forces×Opportunités, etc.).''',
    4: '''Mission : Cartographie concurrentielle CONCRÈTE.

Identifie 4-8 concurrents PERTINENTS pour ce périmètre :
  - 2-3 leaders historiques
  - 2-3 challengers en croissance
  - 1-2 disrupteurs potentiels (startup, nouvel entrant, plateforme)

Pour chaque concurrent : nom, positionnement, forces, faiblesses, signaux récents.
Place-les sur 2 axes différenciants (prix vs. valeur, généraliste vs. spécialiste, etc.).

Termine par :
  - 3 axes de différenciation possibles pour l'entreprise
  - Recommandation de positionnement

Positionne AUSSI l'entreprise étudiée :
  - place-la sur les MÊMES 2 axes (subject_position : x_axis, y_axis, même échelle que les concurrents) avec un résumé de sa position relative
  - fournis une COMPARAISON tête-à-tête (comparison) : pour chaque concurrent clé, les avantages de l'entreprise (our_advantages), ses écarts (our_gaps) et un verdict d'une phrase''',
    5: '''Mission : SYNTHÈSE EXÉCUTIVE consolidant PESTEL + SWOT + Concurrence + Porter + Chaîne de valeur.

Tu fais un DIAGNOSTIC dirigeant, en 5 sections :
  1. Position stratégique actuelle (2-3 phrases)
  2. Triangle des forces : ce qui tient l'entreprise debout
  3. Lignes de faille : les 3-5 risques majeurs
  4. Fenêtres d'opportunité : ce qu'il faut saisir SOUS 18 MOIS
  5. Verdict en 1 paragraphe pour le PDG (le « niveau de risque/urgence stratégique »)

Ton style : tranchant, hiérarchisé, sans langue de bois. Comme un consultant senior post-mission.''',
    6: '''Mission : Définir 3-4 AXES STRATÉGIQUES MAJEURS et leur plan d'exécution sur 18 mois.

Pour chaque axe stratégique :
  - Titre court et puissant (ex: "Conquérir l'export DACH")
  - Description (2-3 phrases sur la logique)
  - 3-5 initiatives concrètes
  - 1-2 quick wins identifiés (< 3 mois)
  - Roadmap 18 mois avec jalons trimestriels
  - Ressources clés à mobiliser

Évite le jargon. Privilégie l'action sur la théorie.
Quick wins = actions à fort impact, faible effort, démarrables sous 2 semaines.''',
    7: '''Mission : Définir un TABLEAU DE BORD STRATÉGIQUE avec 10-12 KPIs clés.

Catégoriser en 4 perspectives Balanced Scorecard :
  - FINANCIER (3-4 KPIs)
  - CLIENT (2-3 KPIs)
  - PROCESSUS (2-3 KPIs)
  - APPRENTISSAGE & TALENTS (2 KPIs)

Pour chaque KPI :
  - Nom clair
  - Définition (formule)
  - Valeur actuelle estimée (si possible)
  - Cible à 12 mois
  - Benchmark sectoriel
  - Fréquence de suivi

Privilégie des KPIs qui se mesurent VRAIMENT (pas de vanity metrics).''',
    8: '''Mission : Produire 3 LIVRABLES FINAUX consolidés à partir de l'ensemble des analyses.

1) RAPPORT DIRIGEANT (1500-2500 mots) : narratif complet pour le PDG
   - Synthèse exécutive (1 page)
   - Analyse stratégique
   - Recommandations prioritaires
   - Plan d'action 18 mois

2) DECK BOARD (10-12 slides) : pitch pour comité de direction
   - Une slide = un point clé
   - Titre, contenu condensé, visualisation suggérée

3) PLAN ÉQUIPES (concret et opérationnel) :
   - Découpage par fonction/département
   - Actions attribuées
   - Échéances

Style : impeccable, structuré, prêt à être présenté SANS retouche.''',
    9: '''Mission : Analyse des 5 FORCES DE PORTER pour évaluer l'attractivité structurelle du marché.

Pour chaque force (Rivalité, Nouveaux entrants, Substituts, Fournisseurs, Clients) :
  - Intensité (LOW / MEDIUM / HIGH)
  - Score numérique 1-5
  - Justification précise et sectorielle
  - Tendance (en hausse / stable / en baisse)

Termine par :
  - Score global d'attractivité du marché (1-5)
  - 3 leviers prioritaires pour neutraliser les forces les plus fortes''',
    10: '''Mission : Analyse de la CHAÎNE DE VALEUR de Porter.

Pour chaque activité, identifie :
  - Importance stratégique (HIGH / MEDIUM / LOW)
  - Performance actuelle estimée (HIGH / MEDIUM / LOW)
  - Sources de valeur ajoutée
  - Gisements d'amélioration

ACTIVITÉS PRIMAIRES :
  1. Logistique entrante
  2. Production / opérations
  3. Logistique sortante
  4. Marketing & ventes
  5. Services

ACTIVITÉS DE SUPPORT :
  1. Infrastructure (direction, finance, planification)
  2. RH
  3. Technologie / R&D
  4. Approvisionnements

Termine par les 3 maillons à muscler en priorité.''',
    11: '''Mission : Analyse BCG du portefeuille de produits/services.

Identifie 4-8 lignes (produits, services, segments client) et place-les :
  - Star (croissance haute, part de marché haute)
  - Cash Cow (croissance basse, part haute)
  - Question Mark (croissance haute, part basse)
  - Dog (croissance basse, part basse)

Pour chaque ligne :
  - Nom
  - % du CA estimé
  - Croissance de marché (axe Y, %)
  - Part de marché relative (axe X)
  - Recommandation : DEVELOP / HARVEST / MAINTAIN / DIVEST''',
    12: '''Mission : Plan de CONDUITE DU CHANGEMENT pour assurer l'exécution de la stratégie.

Tu produis :
  1. Cartographie des parties prenantes (5-8) avec :
     - Niveau d'influence (HIGH/MEDIUM/LOW)
     - Niveau de soutien (CHAMPION/SUPPORTER/NEUTRAL/RESISTANT/BLOCKER)
     - Action recommandée

  2. RACI sur les 5-8 actions clés

  3. Plan de communication :
     - 3-4 messages clés selon les audiences
     - Canaux (assemblée, intranet, 1-to-1, formation...)
     - Calendrier

  4. Risques de résistance et mitigations

  5. 3 quick wins pour créer l'élan dès le mois 1''',
    13: '''Mission : REGISTRE DES RISQUES actionnable, à partir du diagnostic et des axes stratégiques.

Identifie 6 à 10 risques majeurs (stratégiques, opérationnels, financiers, marché, réglementaires).
Pour CHAQUE risque :
  - intitulé clair
  - catégorie
  - probabilité notée de 1 (rare) à 5 (quasi certain)
  - impact noté de 1 (mineur) à 5 (critique)
  - plan de mitigation concret
  - fonction/responsable pressenti
  - horizon (court / moyen / long terme)

Termine par une synthèse : les 3 risques prioritaires (probabilité × impact les plus élevés).''',
    14: '''Mission : ANALYSE FINANCIÈRE & SCÉNARIOS, à partir des données financières, du diagnostic et des axes.

1. SENSIBILITÉ : identifie la ou les variables financières critiques (ex. coût d'une matière première dominante, volume, prix de vente) et chiffre l'effet d'une variation de ±10 % et ±20 % sur la marge. Si tu ne disposes pas du chiffre exact, raisonne en pourcentage et marque l'hypothèse.

2. SCÉNARIOS : construis 3 scénarios (pessimiste / central / optimiste) avec leurs hypothèses et leur effet indicatif sur le chiffre d'affaires et la marge.

3. CHIFFRAGE DES AXES : pour chaque axe stratégique majeur, donne un ordre de grandeur d'investissement, le gain attendu et un délai de retour (payback) indicatif.

Respecte strictement les règles de rigueur : aucun chiffre précis non étayé ; utilise des fourchettes et marque les hypothèses.''',
    15: '''Mission : CONTRÔLE DE COHÉRENCE de l'ensemble de l'analyse (rôle de relecteur).

Relis les sorties des autres agents (diagnostic, axes, KPIs, livrables, conduite du changement) et détecte les INCOHÉRENCES et CONTRADICTIONS :
  - chiffres ou hypothèses incompatibles entre agents
  - axe stratégique qui contredit le diagnostic
  - KPI sans lien avec un axe
  - recommandation non soutenable au vu des données

Pour CHAQUE incohérence : description, agents concernés, sévérité (LOW/MEDIUM/HIGH) et correction suggérée.
Termine par une appréciation globale de la cohérence de l'analyse.''',
}

_SCHEMAS_JSON: dict[int, str] = {
    1: r'''
    {
        "type": "object",
        "properties": {
            "activity": {
                "type": "string"
            },
            "clientele": {
                "type": "string"
            },
            "positioning": {
                "type": "string"
            },
            "initial_strengths": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "key_challenges": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "synthesis": {
                "type": "string"
            }
        },
        "required": [
            "activity",
            "synthesis"
        ]
    }
    ''',
    2: r'''
    {
        "type": "object",
        "properties": {
            "political": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "economic": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "social": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "technological": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "environmental": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "legal": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/factor"
                }
            },
            "key_insights": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "$defs": {
            "factor": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "description": {
                        "type": "string"
                    },
                    "impact": {
                        "type": "string",
                        "enum": [
                            "POSITIVE",
                            "NEGATIVE",
                            "NEUTRAL"
                        ]
                    },
                    "intensity": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5
                    },
                    "horizon": {
                        "type": "string",
                        "enum": [
                            "short",
                            "medium",
                            "long"
                        ]
                    }
                },
                "required": [
                    "title",
                    "description",
                    "impact",
                    "intensity"
                ]
            }
        },
        "required": [
            "political",
            "economic",
            "social",
            "technological",
            "environmental",
            "legal"
        ]
    }
    ''',
    3: r'''
    {
        "type": "object",
        "properties": {
            "strengths": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/item"
                }
            },
            "weaknesses": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/item"
                }
            },
            "opportunities": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/item"
                }
            },
            "threats": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/item"
                }
            },
            "tows_actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": [
                                "SO",
                                "ST",
                                "WO",
                                "WT"
                            ]
                        },
                        "action": {
                            "type": "string"
                        },
                        "rationale": {
                            "type": "string"
                        }
                    }
                }
            }
        },
        "$defs": {
            "item": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "description": {
                        "type": "string"
                    },
                    "priority": {
                        "type": "string",
                        "enum": [
                            "HIGH",
                            "MEDIUM",
                            "LOW"
                        ]
                    }
                },
                "required": [
                    "title",
                    "description"
                ]
            }
        },
        "required": [
            "strengths",
            "weaknesses",
            "opportunities",
            "threats"
        ]
    }
    ''',
    4: r'''
    {
        "type": "object",
        "properties": {
            "competitors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "type": {
                            "type": "string",
                            "enum": [
                                "LEADER",
                                "CHALLENGER",
                                "DISRUPTOR",
                                "NICHE"
                            ]
                        },
                        "positioning": {
                            "type": "string"
                        },
                        "strengths": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "weaknesses": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "recent_signals": {
                            "type": "string"
                        },
                        "x_axis": {
                            "type": "number"
                        },
                        "y_axis": {
                            "type": "number"
                        }
                    }
                }
            },
            "axes": {
                "type": "object",
                "properties": {
                    "x_label": {
                        "type": "string"
                    },
                    "y_label": {
                        "type": "string"
                    }
                }
            },
            "differentiation_angles": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "positioning_recommendation": {
                "type": "string"
            },
            "subject_position": {
                "type": "object",
                "properties": {
                    "x_axis": { "type": "number" },
                    "y_axis": { "type": "number" },
                    "summary": { "type": "string" }
                }
            },
            "comparison": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "competitor": { "type": "string" },
                        "our_advantages": { "type": "array", "items": { "type": "string" } },
                        "our_gaps": { "type": "array", "items": { "type": "string" } },
                        "verdict": { "type": "string" }
                    }
                }
            }
        },
        "required": [
            "competitors",
            "positioning_recommendation",
            "subject_position",
            "comparison"
        ]
    }
    ''',
    5: r'''
    {
        "type": "object",
        "properties": {
            "position": {
                "type": "string"
            },
            "core_strengths": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "fault_lines": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "severity": {
                            "type": "string",
                            "enum": [
                                "LOW",
                                "MEDIUM",
                                "HIGH",
                                "CRITICAL"
                            ]
                        },
                        "description": {
                            "type": "string"
                        }
                    }
                }
            },
            "opportunity_windows": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "deadline_months": {
                            "type": "integer"
                        },
                        "rationale": {
                            "type": "string"
                        }
                    }
                }
            },
            "ceo_verdict": {
                "type": "string"
            },
            "urgency_level": {
                "type": "string",
                "enum": [
                    "GREEN",
                    "AMBER",
                    "RED"
                ]
            }
        },
        "required": [
            "position",
            "ceo_verdict",
            "urgency_level"
        ]
    }
    ''',
    6: r'''
    {
        "type": "object",
        "properties": {
            "strategic_axes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        },
                        "initiatives": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "quick_wins": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "milestones": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "quarter": {
                                        "type": "string"
                                    },
                                    "milestone": {
                                        "type": "string"
                                    }
                                }
                            }
                        },
                        "resources": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    }
                }
            },
            "global_principles": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [
            "strategic_axes"
        ]
    }
    ''',
    7: r'''
    {
        "type": "object",
        "properties": {
            "financial": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/kpi"
                }
            },
            "customer": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/kpi"
                }
            },
            "process": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/kpi"
                }
            },
            "learning": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/kpi"
                }
            },
            "north_star_metric": {
                "type": "string"
            }
        },
        "$defs": {
            "kpi": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "definition": {
                        "type": "string"
                    },
                    "current_value": {
                        "type": "string"
                    },
                    "target_12m": {
                        "type": "string"
                    },
                    "benchmark": {
                        "type": "string"
                    },
                    "frequency": {
                        "type": "string"
                    }
                },
                "required": [
                    "name",
                    "definition"
                ]
            }
        },
        "required": [
            "financial",
            "customer",
            "process",
            "learning"
        ]
    }
    ''',
    8: r'''
    {
        "type": "object",
        "properties": {
            "executive_report": {
                "type": "object",
                "properties": {
                    "executive_summary": {
                        "type": "string"
                    },
                    "strategic_analysis": {
                        "type": "string"
                    },
                    "recommendations": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "action_plan_18m": {
                        "type": "string"
                    }
                },
                "required": [
                    "executive_summary",
                    "strategic_analysis",
                    "recommendations",
                    "action_plan_18m"
                ]
            },
            "board_deck": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "slide_number": {
                            "type": "integer"
                        },
                        "title": {
                            "type": "string"
                        },
                        "content": {
                            "type": "string"
                        },
                        "viz_suggestion": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "slide_number",
                        "title",
                        "content"
                    ]
                }
            },
            "team_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "function": {
                            "type": "string"
                        },
                        "actions": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "deadline": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "function",
                        "actions",
                        "deadline"
                    ]
                }
            }
        },
        "required": [
            "executive_report",
            "board_deck",
            "team_plan"
        ]
    }
    ''',
    9: r'''
    {
        "type": "object",
        "properties": {
            "rivalry": {
                "$ref": "#/$defs/force"
            },
            "new_entrants": {
                "$ref": "#/$defs/force"
            },
            "substitutes": {
                "$ref": "#/$defs/force"
            },
            "suppliers": {
                "$ref": "#/$defs/force"
            },
            "buyers": {
                "$ref": "#/$defs/force"
            },
            "overall_attractiveness": {
                "type": "integer",
                "minimum": 1,
                "maximum": 5
            },
            "key_levers": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "$defs": {
            "force": {
                "type": "object",
                "properties": {
                    "intensity": {
                        "type": "string",
                        "enum": [
                            "LOW",
                            "MEDIUM",
                            "HIGH"
                        ]
                    },
                    "score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5
                    },
                    "rationale": {
                        "type": "string"
                    },
                    "trend": {
                        "type": "string",
                        "enum": [
                            "INCREASING",
                            "STABLE",
                            "DECREASING"
                        ]
                    }
                },
                "required": [
                    "intensity",
                    "score",
                    "rationale"
                ]
            }
        },
        "required": [
            "rivalry",
            "new_entrants",
            "substitutes",
            "suppliers",
            "buyers",
            "overall_attractiveness"
        ]
    }
    ''',
    10: r'''
    {
        "type": "object",
        "properties": {
            "primary_activities": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/activity"
                }
            },
            "support_activities": {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/activity"
                }
            },
            "key_value_drivers": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "priority_improvements": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "$defs": {
            "activity": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "importance": {
                        "type": "string",
                        "enum": [
                            "HIGH",
                            "MEDIUM",
                            "LOW"
                        ]
                    },
                    "performance": {
                        "type": "string",
                        "enum": [
                            "HIGH",
                            "MEDIUM",
                            "LOW"
                        ]
                    },
                    "value_sources": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "improvements": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },
                "required": [
                    "name",
                    "importance",
                    "performance"
                ]
            }
        },
        "required": [
            "primary_activities",
            "support_activities"
        ]
    }
    ''',
    11: r'''
    {
        "type": "object",
        "properties": {
            "lines": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "quadrant": {
                            "type": "string",
                            "enum": [
                                "STAR",
                                "CASH_COW",
                                "QUESTION_MARK",
                                "DOG"
                            ]
                        },
                        "revenue_share_percent": {
                            "type": "number"
                        },
                        "market_growth_percent": {
                            "type": "number"
                        },
                        "relative_market_share": {
                            "type": "number"
                        },
                        "recommendation": {
                            "type": "string",
                            "enum": [
                                "DEVELOP",
                                "HARVEST",
                                "MAINTAIN",
                                "DIVEST"
                            ]
                        },
                        "rationale": {
                            "type": "string"
                        }
                    }
                }
            },
            "portfolio_balance": {
                "type": "string"
            },
            "key_decisions": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [
            "lines"
        ]
    }
    ''',
    12: r'''
    {
        "type": "object",
        "properties": {
            "stakeholders": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "role": {
                            "type": "string"
                        },
                        "influence": {
                            "type": "string",
                            "enum": [
                                "HIGH",
                                "MEDIUM",
                                "LOW"
                            ]
                        },
                        "support": {
                            "type": "string",
                            "enum": [
                                "CHAMPION",
                                "SUPPORTER",
                                "NEUTRAL",
                                "RESISTANT",
                                "BLOCKER"
                            ]
                        },
                        "action": {
                            "type": "string"
                        }
                    }
                }
            },
            "raci": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string"
                        },
                        "responsible": {
                            "type": "string"
                        },
                        "accountable": {
                            "type": "string"
                        },
                        "consulted": {
                            "type": "string"
                        },
                        "informed": {
                            "type": "string"
                        }
                    }
                }
            },
            "communication_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string"
                        },
                        "audience": {
                            "type": "string"
                        },
                        "channel": {
                            "type": "string"
                        },
                        "timing": {
                            "type": "string"
                        }
                    }
                }
            },
            "resistance_risks": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "month_one_quick_wins": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [
            "stakeholders"
        ]
    }
    ''',
    13: r'''
    {
        "type": "object",
        "properties": {
            "risks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "category": { "type": "string" },
                        "probability": { "type": "integer" },
                        "impact": { "type": "integer" },
                        "mitigation": { "type": "string" },
                        "owner": { "type": "string" },
                        "horizon": { "type": "string" }
                    }
                }
            },
            "synthesis": { "type": "string" }
        },
        "required": [
            "risks",
            "synthesis"
        ]
    }
    ''',
    14: r'''
    {
        "type": "object",
        "properties": {
            "sensitivity": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "variable": { "type": "string" },
                        "change": { "type": "string" },
                        "impact_on_margin": { "type": "string" },
                        "comment": { "type": "string" }
                    }
                }
            },
            "scenarios": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "assumptions": { "type": "array", "items": { "type": "string" } },
                        "revenue_effect": { "type": "string" },
                        "margin_effect": { "type": "string" },
                        "comment": { "type": "string" }
                    }
                }
            },
            "axis_costing": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "axis": { "type": "string" },
                        "investment": { "type": "string" },
                        "expected_gain": { "type": "string" },
                        "payback": { "type": "string" }
                    }
                }
            },
            "synthesis": { "type": "string" }
        },
        "required": [
            "scenarios",
            "synthesis"
        ]
    }
    ''',
    15: r'''
    {
        "type": "object",
        "properties": {
            "inconsistencies": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": { "type": "string" },
                        "agents_involved": { "type": "array", "items": { "type": "string" } },
                        "severity": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH"] },
                        "suggested_fix": { "type": "string" }
                    }
                }
            },
            "overall_consistency": { "type": "string" }
        },
        "required": [
            "inconsistencies",
            "overall_consistency"
        ]
    }
    ''',
}

SCHEMAS: dict[int, dict] = {k: json.loads(v) for k, v in _SCHEMAS_JSON.items()}
