export enum RESOURCE_TYPE {
  "BACKGROUND" = "background",
  "CHARACTER" = "character",
  "ICON" = "icon"
}

export interface ResourceModel {
  resource_id: string;
  name: string;
  type: RESOURCE_TYPE;
  link: string;
}

export const SENTIO_CHARACTER_FREE_MODELS: ResourceModel[] = [
  { resource_id: "1", name: "HaruGreeter", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/HaruGreeter/HaruGreeter.model3.json" },
  { resource_id: "2", name: "Haru", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Haru/Haru.model3.json" },
  { resource_id: "3", name: "Kei", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Kei/Kei.model3.json" },
  { resource_id: "4", name: "Chitose", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Chitose/Chitose.model3.json" },
  { resource_id: "5", name: "Epsilon", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Epsilon/Epsilon.model3.json" },
  { resource_id: "6", name: "Hibiki", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Hibiki/Hibiki.model3.json" },
  { resource_id: "7", name: "Hiyori", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Hiyori/Hiyori.model3.json" },
  { resource_id: "8", name: "Izumi", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Izumi/Izumi.model3.json" },
  { resource_id: "9", name: "Mao", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Mao/Mao.model3.json" },
  { resource_id: "10", name: "Rice", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Rice/Rice.model3.json" },
  { resource_id: "11", name: "Shizuku", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Shizuku/Shizuku.model3.json" },
  { resource_id: "12", name: "Tsumiki", type: RESOURCE_TYPE.CHARACTER, link: "/sentio/characters/free/Tsumiki/Tsumiki.model3.json" },
];
