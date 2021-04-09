export interface IDisposable {
  /** Cleanup Function */
  dispose(): void;
}

export enum EndOfLineSequence {
  LF = "\n",
  CRLF = "\r\n",
}

class ValidationError extends Error {}

class InheritanceError extends Error {}

class NoopError extends Error {}

class InvalidOperationError extends Error {}

class InvalidOperationOrderError extends Error {}

class InvalidEventError extends Error {}

class DatabaseTransactionError extends Error {}

/**
 * Common Utility Methods
 */
export class Utils {
  static validateInteger(n: number, err?: string): void {
    if (!Number.isInteger(n)) {
      throw new ValidationError(
        err || "Validation failed: Expected an integer value"
      );
    }
  }

  static validateNonNegativeInteger(n: number, err?: string): void {
    Utils.validateInteger(n, err);

    if (n < 0) {
      throw new ValidationError(
        err || "Validation failed: Expected a non-negative integer value"
      );
    }
  }

  static validateString(n: string, err?: string): void {
    if (typeof n !== "string") {
      throw new ValidationError(
        err || "Validation failed: Expected a string value"
      );
    }
  }

  static validateEquality(
    first: string | number | boolean | symbol,
    second: string | number | boolean | symbol,
    err?: string
  ) {
    if (first !== second) {
      throw new ValidationError(
        err ||
          `Validation failed: Expected ${first.toString()} to be equal ${second.toString()}.`
      );
    }
  }

  static validateInEquality(
    first: string | number | boolean | symbol,
    second: string | number | boolean | symbol,
    err?: string
  ) {
    if (first === second) {
      throw new ValidationError(
        err ||
          `Validation failed: Expected ${first.toString()} to not be equal ${second.toString()}.`
      );
    }
  }

  static validateLessThanOrEqual(first: number, second: number, err?: string) {
    if (first > second) {
      throw new ValidationError(
        err ||
          `Validation failed: Expected ${first} to be less than or equal ${second}.`
      );
    }
  }

  static validateTruth(arg: boolean | null | undefined, err?: string) {
    if (arg == null || arg === false) {
      throw new ValidationError(
        err || "Validation failed: Expected a Truth value"
      );
    }
  }

  static validateFalse(arg: boolean | null | undefined, err?: string) {
    if (arg === true) {
      throw new ValidationError(
        err || "Validation failed: Expected a False value"
      );
    }
  }

  static shouldNotGetCalled(err?: string): void {
    throw new NoopError(
      err || "This method should not get called or has no operation to perform"
    );
  }

  static shouldImplementInChild(err?: string): void {
    throw new InheritanceError(
      err || "This method must be implemented in child class to be invoked"
    );
  }

  static shouldNotBeComposedOrApplied(err?: string): void {
    throw new InvalidOperationOrderError(
      err ||
        "Invalid order of operation recieved that cannot be composed or applied"
    );
  }

  static shouldNotBeListenedTo(event: string, err?: string): void {
    throw new InvalidEventError(
      err || `Unknown event ${event} to add/remove listener for given object`
    );
  }

  static onFailedDatabaseTransaction(err?: string): void {
    throw new DatabaseTransactionError(err || "Transaction Failure!");
  }

  static onInvalidOperationRecieve(err?: string): void {
    throw new InvalidOperationError(err || "Invalid operation recieved!");
  }

  static noop(): void {}

  static rgbToHex(red: number, blue: number, green: number): string {
    const depth = [red, blue, green].map((color) =>
      Math.round(255 * color)
        .toString(16)
        .padStart(2, "0")
    );

    return ["#", ...depth].join("");
  }

  static hueToRgb(
    degree: number,
    percentage1: number,
    percentage2: number
  ): number {
    if (degree < 0) {
      degree += 1;
    }

    if (degree > 1) {
      degree -= 1;
    }

    if (6 * degree < 1) {
      return percentage1 + (percentage2 - percentage1) * 6 * degree;
    }

    if (2 * degree < 1) {
      return percentage2;
    }

    if (3 * degree < 2) {
      return percentage1 + (percentage2 - percentage1) * 6 * (2 / 3 - degree);
    }

    return percentage1;
  }

  static hslToHex(hue: number, saturation: number, lightness: number): string {
    if (saturation === 0) {
      return Utils.rgbToHex(lightness, lightness, lightness);
    }

    const percentage2 =
      lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - saturation * lightness;
    const percentage1 = 2 * lightness - percentage2;

    return Utils.rgbToHex(
      Utils.hueToRgb(hue + 1 / 3, percentage1, percentage2),
      Utils.hueToRgb(hue, percentage1, percentage2),
      Utils.hueToRgb(hue - 1 / 3, percentage1, percentage2)
    );
  }

  static colorFromUserId(userId: string) {
    let a = 1;

    for (let i = 0; i < userId.length; i++) {
      a = (17 * (a + userId.charCodeAt(i))) % 360;
    }

    const hue = a / 360;

    return Utils.hslToHex(hue, 1, 0.75);
  }
}
