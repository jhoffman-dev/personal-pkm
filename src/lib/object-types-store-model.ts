export const OBJECT_TYPES_STORAGE_KEY = "pkm.object-types.v1";

export type ObjectPropertyType =
  | "text"
  | "email"
  | "phone"
  | "address"
  | "number"
  | "date"
  | "picture"
  | "select"
  | "connection";

export type ObjectTypeProperty = {
  id: string;
  name: string;
  type: ObjectPropertyType;
  isRequired: boolean;
  autoSetCurrentDateOnCreate?: boolean;
  options?: string[];
  connectionTypeId?: string;
  connectionMultiplicity?: "single" | "multiple";
  connectionIsBidirectional?: boolean;
  connectionReciprocalPropertyId?: string;
};

export type ObjectTypeDefinition = {
  id: string;
  name: string;
  isSystem: boolean;
  cardImagePropertyId?: string;
  properties: ObjectTypeProperty[];
};
