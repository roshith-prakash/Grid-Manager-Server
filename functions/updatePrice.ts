import { prisma } from "../utils/primsaClient.ts";
import { driverPrices, constructorPrices } from "../constants/Prices.ts";

export const updatePrices = async () => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { points: "desc" },
    });
    const constructors = await prisma.constructor.findMany({
      orderBy: { points: "desc" },
    });

    const updateDriverPrices = drivers?.map((driver, index) => {
      return prisma.driver.update({
        where: {
          id: driver?.id,
        },
        data: {
          price: driverPrices[index],
        },
      });
    });

    const updateConstructorPrices = constructors?.map((constructor, index) => {
      return prisma.constructor.update({
        where: {
          id: constructor?.id,
        },
        data: {
          price: constructorPrices[index],
        },
      });
    });

    const updatePromises = [...updateDriverPrices, ...updateConstructorPrices];

    await Promise.all(updatePromises);
  } catch (err) {
    console.log(err);
  }
};
