interface ChoroGeoJSON {
  type: string;
  features?: ChoroFeature[];
  geometry?: ChoroGeometry;
  properties?: ChoroProperties;
}

interface ChoroFeature extends ChoroGeoJSON {
  type: "Feature";
  geometry: ChoroGeometry;
  properties: ChoroProperties;
  id?: string | number;
}

interface ChoroGeometry {
  type: string;
  coordinates: any;
}

interface ChoroProperties {
  name: string;
  // ... other properties

  // Relations to other Features (using their IDs)
  risesIn?: (string | number)[];
  replaces?: (string | number)[];
  partlyContains?: (string | number)[];
  isReplacedBy?: (string | number)[];
  isRelatedTo?: (string | number)[];
  isPreferredAlternativeOf?: (string | number)[];
  isPartlyPartOf?: (string | number)[];
  isPartOf?: (string | number)[];
  isInfluencedBy?: (string | number)[];
  isAdministrativePartOf?: (string | number)[];
  isAdjacentTo?: (string | number)[];
  influences?: (string | number)[];
  inContextOf?: (string | number)[];
  hasTributary?: (string | number)[];
  hasPreferredAlternative?: (string | number)[];
  hasGeometry?: (string | number)[]; // If you want to link to another geometry
  hasAdministrativePart?: (string | number)[];
  flowsThrough?: (string | number)[];
  flowsInto?: (string | number)[];
  containsWatercourse?: (string | number)[];
  containsSourceOf?: (string | number)[];
  contains?: (string | number)[];

  [key: string]: any;
}

// Example Usage

const feature1: ChoroFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    name: "Region A",
    contains: ["feature2", 3], // Contains feature with id "feature2" and id 3
    isAdjacentTo: [4],
  },
  id: "feature1", // Important: Add IDs to your features
};

const feature2: ChoroFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    name: "Region B",
    isPartOf: ["feature1"], // Part of Region A
    risesIn: [5], // rises in feature with id 5
  },
  id: "feature2",
};

const feature3: ChoroFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    name: "Region C",
    isPartOf: ["feature1"], // Part of Region A
  },
  id: 3, // numeric id
};

const feature4: ChoroFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    name: "Region D",
    isAdjacentTo: ["feature1"], // Adjacent to Region A
  },
  id: 4,
};

const feature5: ChoroFeature = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    name: "Source Region",
  },
  id: 5,
};

const featureCollection: ChoroGeoJSON = {
  type: "FeatureCollection",
  features: [feature1, feature2, feature3, feature4, feature5],
};

console.log(JSON.stringify(featureCollection, null, 2));
