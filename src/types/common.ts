import { Constr, Data } from "@spacebudz/lucid";

import { DataType } from "..";

export namespace Options {
  export function toPlutusData<T>(
    data: T | undefined,
    toPlutusDataFn: (data: T) => Data
  ): Constr<DataType> {
    return data !== undefined
      ? new Constr(0, [toPlutusDataFn(data)])
      : new Constr(1, []);
  }

  export function fromPlutusData<T>(
    data: Constr<DataType>,
    fromPlutusDataFn: (data: Data) => T
  ): T | undefined {
    switch (data.index) {
      case 0: {
        return fromPlutusDataFn(data.fields[0]);
      }
      case 1: {
        return undefined;
      }
      default: {
        throw Error(`Index of Options must be 0 or 1, actual: ${data.index}`);
      }
    }
  }
}

export namespace Bool {
  export function toPlutusData(data: boolean): Constr<DataType> {
    return data ? new Constr(1, []) : new Constr(0, []);
  }

  export function fromPlutusData(data: Constr<DataType>): boolean {
    switch (data.index) {
      case 0: {
        return false;
      }
      case 1: {
        return true;
      }
      default: {
        throw Error(`Index of Bool must be 0 or 1, actual: ${data.index}`);
      }
    }
  }
}

export namespace RedeemerWrapper {
  export function toPlutusData(d: Data): Data {
    return new Constr(1, [d]);
  }

  export function fromPlutusData(data: Constr<DataType>): Data {
    switch (data.index) {
      case 1: {
        return data.fields[0];
      }
      default: {
        throw Error(
          `Index of RedeemerWrapper must be 1, actual: ${data.index}`
        );
      }
    }
  }
}
