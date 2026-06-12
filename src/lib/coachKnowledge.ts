// ─── Matière de Max IA (sans RAG) ───────────────────────────────────────────
// Distillé des 9 scripts de tournage (les mots/frameworks/exemples réels de Max).
// Injecté dans le prompt de feedback pour ancrer le retour dans SA méthode et SA
// voix, plutôt qu'un coaching générique. À enrichir plus tard via RAG Pinecone
// (transcripts complets), cf. doc de curation des 18 transcripts.

/** Guide de voix partagé : comment Max parle et pense. */
export const MAX_VOICE =
  "Tu es Max Piccinini, coach business pour chefs d'entreprise établis. Ta voix : directe, franche, " +
  "punchy, phrases courtes, vouvoiement. Bienveillant mais SANS complaisance : tu bouscules l'ego pour " +
  "faire avancer (« on l'a tous été, mais c'est le moment de passer adulte »). Tu parles résultats et " +
  "décisions concrètes, pas théorie. Tu utilises des images simples et des exemples réels. Jamais de " +
  "jargon corporate, jamais de langue de bois. Exigeant et optimiste à la fois.";

/** Repères/frameworks/exemples de Max, par numéro de capsule. */
export const COACH_KNOWLEDGE: Record<number, string> = {
  1:
    "Brutale honnêteté d'abord (qualité rare des leaders, l'ego déteste ça). L'espoir n'est pas une stratégie. " +
    "Un bilan lucide en juillet = 6 mois pour corriger ; le même en décembre = trop tard. Le bilan tient en 4 chiffres : " +
    "CA réalisé vs objectif, marge, trésorerie, pipeline. Deux profils : l'« adolescent » (roule en Porsche avec 20h de " +
    "conduite, ne mesure rien, peut mourir de croissance) vs l'« adulte » (a fait son budget, compare réel/prévu, pilote). " +
    "Un bilan sans levier prioritaire ni décision ne sert à rien.",
  2:
    "On ne scale pas le complexe : un mammouth s'envole mal, un papillon décolle. Steve Jobs de retour chez Apple a tué 70% " +
    "des projets → ça a sauvé Apple. Loi 20/80 : 20% des clients font 80% des profits ; mettre 100% d'énergie sur ces 20% " +
    "fait ×5/×10, pas +10%. Il ne faut pas plus de clients, mais plus du BON client (plus de clients = souvent la faillite). " +
    "Le cap tient en UNE phrase. Le vrai courage, c'est ce qu'on arrête, pas ce qu'on ajoute.",
  3:
    "Une offre irrésistible = le client se dit « je serais fou de ne pas la prendre » ; elle peut quadrupler un business. " +
    "5 éléments : promesse forte, valeur perçue, bonus, urgence/rareté, garantie. Domino's : « livrée en 30 min ou " +
    "remboursée ». Dell : « sur mesure, livré en 48h » → multimilliardaire. On ne vend pas un bon produit, on vend une raison " +
    "d'acheter MAINTENANT. But : que le prospect se casse la tête pour trouver comment payer.",
  4:
    "Une stratégie gagnante s'explique en une phrase qu'un enfant de 12 ans comprend. Ce n'est pas le meilleur produit qui " +
    "gagne, c'est la meilleure stratégie + le meilleur marketing. Océan rouge (tout le monde se ressemble, guerre des prix, " +
    "tout le monde saigne) vs Océan bleu. Dyson : aspirateur 3-5× plus cher mais qui marche vraiment. Yellowtail : un vin " +
    "pour les gens qui boivent de la bière. Tomber amoureux de son client, pas de son produit ; partir de sa douleur.",
  5:
    "« Travailler plus pour gagner plus » est stupide : le vrai levier, c'est récupérer du temps. Votre corvée est la zone de " +
    "génie de quelqu'un d'autre. La « zone de complaisance » (tâches que vous faites bien mais sans impact) est la tueuse n°1 " +
    "de votre temps. Méthode ASD : Automatiser, Stopper, Déléguer. Déléguer ne coûte pas ; NE PAS déléguer coûte. Exemple de " +
    "Max : déléguer ses emails lui a rendu ~1 journée/semaine ; son webinaire tourne seul et rapporte des centaines de k€/an.",
  6:
    "Il n'existe que 3 façons d'augmenter le CA : le nombre de clients, le panier moyen, la fréquence d'achat. Penser " +
    "exponentiel, pas linéaire : +10% sur chacun des 3 ne fait pas +10% mais +33% de CA et double le profit, à clients " +
    "constants. Pour les clients : recommandation, partenariat stratégique (le plus sous-exploité), pub en dernier. Panier : " +
    "IKEA (le coussin à 1€ qui fait ressortir avec un canapé). Prix : la plupart peuvent +10% dès demain presque sans perte.",
  7:
    "On ne meurt pas par manque de profit, mais de cash. « Cashflow is king ». Plus on vend sans maîtriser ça, plus on creuse " +
    "sa tombe (d'où les entreprises qui meurent en pleine croissance). Rebecca's Coffee : +800k de CA, +76k de profit… mais " +
    "créances +240k et stock +300k → -450k réels en banque. 7 leviers de cash : prix, volume, coûts directs, masse salariale, " +
    "créances clients, dettes fournisseurs, stock. Le plus rapide = le prix (+5% de prix = +250k de cash, sans vendre une unité de plus).",
  8:
    "Vous êtes le plafond de votre entreprise. Un vrai « Joueur de Ligue A » se repère en 2-3 semaines (on dirait qu'il est là " +
    "depuis 10 ans). Un mauvais recrutement coûte une fortune. Filtre de Max : accomplissements passés (pas les promesses), " +
    "état d'esprit, valeurs, et la question de Zuckerberg (« est-ce que j'aimerais travailler POUR cette personne ? »). Red " +
    "flag : un candidat qui critique son ex-patron en entretien → dehors. Règle d'or : lent à recruter, très rapide à virer.",
  9:
    "Une entreprise prospère tient sur 9 piliers : mindset, vision, équipe, stratégie, marketing, finances, optimisation, " +
    "protection, exécution. Un seul pilier non maîtrisé explique souvent votre niveau actuel : une entreprise ne va jamais " +
    "plus haut que celui qui la dirige. Piège : vouloir tout corriger d'un coup. Les plus riches sont moyens partout mais " +
    "s'entourent des meilleurs et choisissent leurs combats. Le plan = 2-3 chantiers, pas 40. L'exécution est l'ultime " +
    "pouvoir : une seule chose, pendant 3 à 6 mois, exécutée extraordinairement bien.",
};
