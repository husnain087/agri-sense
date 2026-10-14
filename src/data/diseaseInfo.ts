import type { KnownClass } from "../types/prediction";

export interface DiseaseInfo {
  id: KnownClass;
  label: string;
  scientificName: string;
  shortSummary: string;
  description: string;
  symptoms: string[];
  advisory: string[];
  limitations: string[];
  statusTone: "healthy" | "caution" | "alert";
}

export const DISEASE_INFO: Partial<Record<KnownClass, DiseaseInfo>> = {
  Healthy: {
    id: "Healthy",
    label: "Healthy",
    scientificName: "No disease class assigned",
    shortSummary:
      "The model assigned this wheat-leaf image to the Healthy class.",
    description:
      "A Healthy classification means the trained EfficientNet-B0 model judged this leaf image to be closer to healthy training examples than to Septoria or stripe rust. It is not a guarantee that the plant, plot, or field is disease-free. Other leaves, other diseases, nutrient stress, insect damage, and early infections may not be visible in a single image.",
    symptoms: [
      "Typical healthy wheat leaves are green, without the brown necrotic blotches associated with Septoria or the yellow linear pustules of stripe rust.",
      "A single photo cannot confirm the health of surrounding plants.",
    ],
    advisory: [
      "Continue regular field walks and inspect multiple leaves at several locations.",
      "Keep records of weather, irrigation, and crop stage so later symptoms can be compared.",
      "Follow local good agricultural practices for rotation, residue, and seed quality.",
      "If nearby plants look different, photograph additional leaves and consult a local agronomist.",
    ],
    limitations: [
      "This result applies only to the uploaded image, not to an entire crop.",
      "The model does not estimate severity, infected area, or yield impact.",
    ],
    statusTone: "healthy",
  },
  septoria: {
    id: "septoria",
    label: "Septoria",
    scientificName: "Septoria tritici blotch (Zymoseptoria tritici) and related leaf blotch complexes",
    shortSummary:
      "The model assigned this wheat-leaf image to the Septoria class.",
    description:
      "Septoria leaf blotch (often caused by Zymoseptoria tritici) is a widespread foliar disease of wheat. Typical signs include irregular tan to brown lesions, sometimes with dark fruiting bodies, that can expand and reduce photosynthetic area. Symptom appearance depends on cultivar, growth stage, weather, and mixed infections. Visual diagnosis from one photo is uncertain and can be confused with other blotches, physiological spotting, or nutrient disorders.",
    symptoms: [
      "Irregular necrotic lesions on leaves; fruiting bodies may appear as small dark spots within lesions.",
      "Severity and lesion pattern vary; early or atypical cases may be easy to miss or misclassify.",
    ],
    advisory: [
      "Inspect other leaves on the same plant and nearby plants to see whether similar symptoms are present.",
      "Note recent humidity, rainfall, and crop stage; Septoria pressure is often weather-linked.",
      "Consult a local agricultural extension service or crop advisor before choosing any treatment.",
      "Prevention typically emphasizes resistant cultivars, rotation, residue management, and timely canopy monitoring — exact tactics depend on local recommendations.",
    ],
    limitations: [
      "This classifier does not diagnose disease severity or calculate an infected-area percentage.",
      "It does not prescribe pesticides, doses, or spray schedules.",
      "A model score is not a laboratory confirmation.",
    ],
    statusTone: "caution",
  },
  stripe_rust: {
    id: "stripe_rust",
    label: "Stripe rust",
    scientificName: "Puccinia striiformis f. sp. tritici",
    shortSummary:
      "The model assigned this wheat-leaf image to the stripe rust class.",
    description:
      "Stripe rust (yellow rust) is caused by Puccinia striiformis f. sp. tritici. It often appears as yellow-to-orange pustules arranged in stripes between leaf veins, especially on susceptible cultivars under cool, humid conditions. Race composition and local disease pressure change by season and region. Rapid spread is possible, so monitoring surrounding plants and nearby fields matters more than a single image.",
    symptoms: [
      "Yellow or orange pustules commonly aligned in stripes on the leaf.",
      "Symptoms can look different on resistant cultivars, at early infection, or after weathering.",
    ],
    advisory: [
      "Check other leaves, tillers, and neighboring plants for similar pustules and note how quickly symptoms change.",
      "Be aware of local stripe-rust alerts and cultivar susceptibility lists from extension services.",
      "Treatment decisions should be made with a qualified local advisor; this app does not recommend specific fungicides or rates.",
      "Record the observation date, location, and cultivar if known so an advisor can interpret risk.",
    ],
    limitations: [
      "The model does not estimate epidemic risk, severity, or infected area.",
      "It does not automatically prescribe chemical treatments.",
      "Expert confirmation is recommended when confidence is modest or symptoms are atypical.",
    ],
    statusTone: "alert",
  },
};

export function getDiseaseInfo(predictedClass: string): DiseaseInfo | null {
  return DISEASE_INFO[predictedClass as KnownClass] ?? null;
}

export function displayClassLabel(predictedClass: string): string {
  const info = getDiseaseInfo(predictedClass);
  if (info) return info.label;
  return predictedClass.replaceAll("_", " ");
}
