export type StaticPage = { title: string; description: string; sections: { heading?: string; body: string[] }[] };

/** Editorial pages. Placeholders marked [À COMPLÉTER] must be reviewed before launch. */
export const STATIC_PAGES: Record<string, StaticPage> = {
  "a-propos": {
    title: "À propos de Dar Ezzin",
    description: "Dar Ezzin, boutique marocaine d'électroménager : notre mission, nos engagements et notre service.",
    sections: [
      {
        body: [
          "Dar Ezzin — « la belle maison » — est une enseigne marocaine spécialisée dans l'électroménager et l'équipement de la maison. Notre mission : rendre les meilleurs appareils accessibles à toutes les familles du Maroc, avec un service simple, honnête et proche de vous.",
        ],
      },
      {
        heading: "Nos engagements",
        body: [
          "Des produits neufs, d'origine et couverts par la garantie constructeur.",
          "Des prix transparents, affichés TTC en dirhams.",
          "La livraison partout au Maroc et le paiement à la livraison.",
          "Un service client joignable par téléphone et WhatsApp, avant et après l'achat.",
        ],
      },
    ],
  },
  "livraison-retours": {
    title: "Livraison & retours",
    description: "Délais et frais de livraison au Maroc, paiement à la livraison, retours et garantie chez Dar Ezzin.",
    sections: [
      {
        heading: "Livraison",
        body: [
          "Nous livrons dans toutes les villes du Maroc. Comptez 24 à 48 h pour Casablanca, Rabat et les grandes villes, et 48 à 72 h pour les autres villes.",
          "Les frais de livraison sont affichés dans le panier ; la livraison est offerte au-delà du seuil indiqué sur le site.",
          "Après votre commande, un conseiller vous appelle pour confirmer l'adresse et le créneau de livraison.",
        ],
      },
      {
        heading: "Paiement",
        body: ["Le paiement s'effectue en espèces à la livraison. Vérifiez votre colis en présence du livreur avant de payer."],
      },
      {
        heading: "Retours",
        body: [
          "Vous disposez de 7 jours après réception pour nous signaler un produit endommagé ou non conforme. Le produit doit être retourné dans son emballage d'origine, complet et non utilisé.",
          "[À COMPLÉTER] Précisez ici les conditions exactes de retour et de remboursement.",
        ],
      },
      {
        heading: "Garantie",
        body: ["Tous nos produits bénéficient de la garantie constructeur dont la durée est indiquée sur chaque fiche produit."],
      },
    ],
  },
  contact: {
    title: "Contactez-nous",
    description: "Contactez le service client Dar Ezzin par téléphone, WhatsApp ou email.",
    sections: [
      {
        body: [
          "Notre équipe est disponible du lundi au samedi, de 9 h à 19 h, pour vous conseiller et suivre vos commandes.",
          "Les coordonnées (téléphone, WhatsApp, email et adresse) sont indiquées ci-dessous et en bas de chaque page.",
        ],
      },
    ],
  },
  "conditions-generales": {
    title: "Conditions générales de vente",
    description: "Conditions générales de vente de la boutique en ligne Dar Ezzin.",
    sections: [
      { heading: "1. Objet", body: ["Les présentes conditions régissent les ventes conclues sur le site Dar Ezzin entre la société [À COMPLÉTER : raison sociale, RC, ICE, adresse] et toute personne effectuant un achat."] },
      { heading: "2. Prix", body: ["Les prix sont indiqués en dirhams marocains toutes taxes comprises. Les frais de livraison sont précisés avant la validation de la commande."] },
      { heading: "3. Commande", body: ["La commande est confirmée par téléphone par notre service client. Dar Ezzin se réserve le droit d'annuler toute commande en cas d'indisponibilité ou d'informations erronées."] },
      { heading: "4. Paiement", body: ["Le paiement s'effectue en espèces à la livraison."] },
      { heading: "5. Livraison et retours", body: ["Voir la page Livraison & retours."] },
      { heading: "6. Droit applicable", body: ["Les présentes conditions sont soumises au droit marocain, notamment la loi n° 31-08 édictant des mesures de protection du consommateur."] },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    description: "Comment Dar Ezzin collecte et protège vos données personnelles.",
    sections: [
      {
        body: [
          "Les données collectées lors de votre commande (nom, téléphone, adresse, email) sont utilisées uniquement pour traiter et livrer votre commande et assurer le service après-vente.",
          "Conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, vous disposez d'un droit d'accès, de rectification et d'opposition. [À COMPLÉTER : n° de déclaration CNDP].",
          "Vos données ne sont jamais vendues à des tiers.",
        ],
      },
    ],
  },
};
