import { Dexie, type EntityTable } from "dexie";
import { ProviderProps, ConversationPorps, MessageProps } from "./types";
import {  providers } from "./testData";
// import { KeepAlive } from "vue";

export const db = new Dexie("vChatDatebase") as Dexie & {
  providers: EntityTable<ProviderProps, "id">; // id 是主键
  conversations: EntityTable<ConversationPorps, "id">;
  messages: EntityTable<MessageProps, "id">;
};

// 数据库索引
// 如果要变更索引结构,需要定义更高的版本,之后再启动会自动更新,直接修改不会触发更新
db.version(1).stores({
  // 通过where可以查询的属性
  // ++	Auto-incremented primary key
  // &	Unique
  // *	Multi-entry index // 会将数组中的每一个字段单据建立索引
  // [A+B]	Compound index
  providers: "++id,name",
  conversations: "++id,providerId",
  messages: "++id,conversationId",
});

export const initProviders = async () => {
  const count = await db.providers.count()
  if (count === 0) {
    db.providers.bulkAdd(providers)
  }
};



  // 新增数据
  // const insertedId =  await db.providers.add(providers[0])
  // console.log("🚀 ~ insertedId:", insertedId)

  // // 查询
  // const items = await db.providers.toArray()
  // console.log("🚀 ~ items:", items)

  // // 查找
  // const find = await db.providers.where({id:1}).toArray()
  // console.log("🚀 ~ find:", find)

  // 更新
  // await db.providers.update(4, {name: "Bar"});

  // 删除
  // await db.providers.delete((4))  // 返回 undefined 删除成功