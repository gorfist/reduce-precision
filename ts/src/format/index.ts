type Template = 'number' | 'usd' | 'irt' | 'irr' | 'percent';
type Precision = 'auto' | 'high' | 'medium' | 'low';
type Language = 'en' | 'fa';
type OutputFormat = 'plain' | 'html' | 'markdown';

interface FormattedObject {
  value?: string;
  prefix: string;
  postfix: string;
  fullPostfix?: string;
  sign: string;
  wholeNumber: string;
}

interface LanguageConfig {
  prefixMarker?: string;
  postfixMarker?: string;
  prefix?: string;
  postfix?: string;
  thousandSeparator?: string;
  decimalSeparator?: string;
}

interface Options extends LanguageConfig {
  precision?: Precision;
  template?: Template;
  language?: Language;
  outputFormat?: OutputFormat;
}

class NumberFormatter {
  private readonly languageBaseConfig: LanguageConfig = {
    prefixMarker: 'i',
    postfixMarker: 'i',
    prefix: '',
    postfix: '',
  };

  private defaultLanguageConfig: { [key in Language]: LanguageConfig } = {
    en: {
      ...this.languageBaseConfig,
      thousandSeparator: ',',
      decimalSeparator: '.',
    },
    fa: {
      ...this.languageBaseConfig,
      thousandSeparator: '٬', // Corrected Farsi thousand separator
      decimalSeparator: '٫', // Corrected Farsi decimal separator
    },
  };

  private options: Options = {
    language: 'en',
    template: 'number',
    precision: 'high',
    outputFormat: 'plain',
    ...this.defaultLanguageConfig['en'],
  };

  constructor(options: Options = {}) {
    // Start with default options (which includes 'en' specific settings)
    let newOptions = { ...this.options };

    // If a language is specified in the incoming options,
    // apply the defaults for that language first.
    if (options.language) {
      const langDefaults = this.defaultLanguageConfig[options.language];
      if (langDefaults) {
        newOptions = { ...newOptions, ...langDefaults, language: options.language };
      }
    }

    // Then, apply all incoming options, allowing them to override.
    // This ensures options.precision, options.decimalSeparator (if any), etc., take precedence.
    newOptions = { ...newOptions, ...options };

    this.options = newOptions;
  }

  setLanguage(lang: Language, config: LanguageConfig = {}): NumberFormatter {
    this.options.language = lang;
    this.options.prefixMarker =
      config.prefixMarker || this.defaultLanguageConfig[lang].prefixMarker;
    this.options.postfixMarker =
      config.postfixMarker || this.defaultLanguageConfig[lang].postfixMarker;
    this.options.prefix =
      config.prefix || this.defaultLanguageConfig[lang].prefix;
    this.options.postfix =
      config.postfix || this.defaultLanguageConfig[lang].postfix;
    this.options.thousandSeparator =
      config.thousandSeparator ||
      this.defaultLanguageConfig[lang].thousandSeparator;
    this.options.decimalSeparator =
      config.decimalSeparator ||
      this.defaultLanguageConfig[lang].decimalSeparator;
    return this;
  }

  setTemplate(template: Template, precision: Precision): NumberFormatter {
    this.options.template = template;
    this.options.precision = precision;
    return this;
  }

  toJson(input: string | number): FormattedObject {
    const formattedObject = this.format(input);
    delete formattedObject.value;

    return formattedObject;
  }

  toString(input: string | number): string {
    const formattedObject = this.format(input);
    return formattedObject.value || '';
  }

  toPlainString(input: string | number): string {
    this.options.outputFormat = 'plain';
    const formattedObject = this.format(input);
    return formattedObject.value || '';
  }

  toHtmlString(input: string | number): string {
    this.options.outputFormat = 'html';
    const formattedObject = this.format(input);
    return formattedObject.value || '';
  }

  toMdString(input: string | number): string {
    this.options.outputFormat = 'markdown';
    const formattedObject = this.format(input);
    return formattedObject.value || '';
  }

  // Private methods...
  private isENotation(input: string): boolean {
    return /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)$/.test(input);
  }

  private format(input: string | number): FormattedObject {
    let { precision, template } = this.options;

    const {
      language,
      outputFormat,
      prefixMarker,
      postfixMarker,
      prefix,
      postfix,
      thousandSeparator,
      decimalSeparator,
    } = this.options;

    if (input === undefined || input === null || input === '') {
      return {} as FormattedObject;
    }
    
    if (!template?.match(/^(number|usd|irt|irr|percent)$/g))
      template = 'number';

    // Store original input string to preserve format for trailing zeros
    const originalInput = input.toString();
    
    if (this.isENotation(originalInput)) {
      input = this.convertENotationToRegularNumber(Number(input));
    }

    // Replace each Persian/Arabic numeral in the string with its English counterpart
    let numberString = input.toString().replace(/[\u0660-\u0669\u06F0-\u06F9]/g, function (match: string) {
      return String(match.charCodeAt(0) & 0xf);
    });

    // Get the configured decimal separator, defaulting to '.'
    const currentDecimalSeparator = this.options.decimalSeparator || '.';

    if (this.options.language === 'fa') {
      // For Persian, explicitly replace all English dots with the Persian decimal separator.
      // This allows users to type '.' and have it treated as the configured Persian separator (e.g., '٫').
      numberString = numberString.replace(/\./g, currentDecimalSeparator);
    }

    // Sanitize the numberString:
    // Keep only digits, the currentDecimalSeparator, and the hyphen.
    // Escape the decimalSeparator if it's a special regex character (e.g., '.').
    const escapedDecimalSeparator = currentDecimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sanitizeRegex = new RegExp(`[^\\d${escapedDecimalSeparator}-]`, 'g');
    numberString = numberString.replace(sanitizeRegex, '');

    // Stripping leading zeros only, preserve trailing zeros
    numberString = numberString.replace(/^0+(?=\d)/g, '');

    const number = Math.abs(Number(numberString));
    let p, d, r, c;
    let f = 0;

    // Auto precision selection
    if (precision === 'auto') {
      if (template.match(/^(usd|irt|irr|number)$/g)) {
        if (number >= 0.0001 && number < 100_000_000_000) {
          precision = 'high';
        } else {
          precision = 'medium';
        }
      } else if (template === 'percent') {
        precision = 'low';
      }
    }

    if (precision === 'medium') {
      if (number >= 0 && number < 0.0001) { // Subscript formatting for very small numbers
        p = 33;
        d = 4;
        r = false;
        c = true;
      } else if (number >= 0.0001 && number < 0.001) {
        p = 7;
        d = 4;
        r = false;
        c = false;
      } else if (number >= 0.001 && number < 0.01) {
        p = 5;
        d = 3;
        r = false;
        c = false;
      } else if (number >= 0.001 && number < 0.1) { // This condition overlaps with the one above. Assuming it means >= 0.01 and < 0.1
        p = 3;
        d = 2;
        r = false;
        c = false;
      } else if (number >= 0.1 && number < 1) {
        p = 1;
        d = 1;
        r = false;
        c = false;
      } else if (number >= 1 && number < 10) {
        p = 3;
        d = 3;
        r = false;
        c = false;
      } else if (number >= 10 && number < 100) {
        p = 2;
        d = 2;
        r = false;
        c = false;
      } else if (number >= 100 && number < 1000) {
        p = 1;
        d = 1;
        r = false;
        c = false;
      } else if (number >= 1000) {
        const x = Math.floor(Math.log10(number)) % 3;
        p = 2 - x;
        d = p; // d should be equal to p
        r = true;
        c = true;
      } else {
        p = 0;
        d = 0;
        r = true;
        c = true;
      }
    } else if (precision === 'low') {
      if (number >= 0 && number < 0.01) { // to get 0.00
        p = 4; // Existing value
        d = 2; // Existing value
        r = true; // Existing value
        c = false; // Existing value
        f = 2; // Important for 0.00
      } else if (number >= 0.01 && number < 0.1) {
        p = 2;
        d = 1;
        r = true;
        c = false;
      } else if (number >= 0.1 && number < 1) {
        p = 2;
        d = 2;
        r = true;
        c = false;
      } else if (number >= 1 && number < 10) { // e.g. x.xx
        p = 2; // Existing value
        d = 2; // Existing value
        r = true; // Existing value
        c = false; // Existing value
        f = 2; // Important
      } else if (number >= 10 && number < 100) { // e.g. xx.x
        p = 1; // Existing value
        d = 1; // Existing value
        r = true; // Existing value
        c = false; // Existing value
        f = 1; // Important
      } else if (number >= 100 && number < 1000) {
        p = 0;
        d = 0;
        r = true;
        c = false;
      } else if (number >= 1000) {
        const x = Math.floor(Math.log10(number)) % 3;
        p = Math.max(0, 1 - x); // Ensures 1 or 2 significant figures, prevents negative p
        d = p; // d should be equal to p
        r = true;
        c = true;
      } else {
        p = 0;
        d = 0;
        r = true;
        c = true;
        f = 2; // Default from existing
      }
    } else { // precision === "high"
      if (number >= 0 && number < 0.0001) { // very small numbers
        p = 40; // max fractional length for reducePrecision
        d = 4;  // significant digits to keep after leading zeros
        r = false;
        c = false;
      } else if (number >= 0.0001 && number < 1) {
        p = 7; // Aim for up to 7 decimal places
        d = 7;
        r = true;
        c = false;
      } else if (number >= 1 && number < 1000000) { // numbers that shouldn't typically be compressed
        p = 5; // Aim for up to 5 decimal places
        d = 5;
        r = true;
        c = false; // No compression
      } else if (number >= 1000000) {
        // For very large numbers in 'high' precision, show more detail, no compression.
        // CSV expectations for "High Precision" do not show K/M/B for large numbers.
        p = 15; // Increased precision for larger numbers
        d = 15; // Increased decimal places for larger numbers
        r = true;
        c = false; // No compression for high precision
      } else { // Default for 'high' if no other condition met (e.g. negative numbers, though number is Math.abs)
        p = 7; // Default to similar to 0.0001 to 1 range
        d = 7;
        r = true;
        c = false;
      }
    }

    // For scientific notation, increase precision to ensure correct representation
    if (this.isENotation(originalInput)) {
      // For 'high' precision and e-notation, we want to show significant digits accurately.
      // The new 'high' precision rules for very small numbers (p=30, d=6) should handle this.
      // If existing p is already higher due to other logic, keep it.
      if (precision === 'high' && number > 0 && number < 0.0001) {
        // p is already 30, d is 6, r is false. This is generally good for e-notation small numbers.
      } else {
         p = Math.max(p, 20); // Keep this for other non-high precision cases or larger e-notation numbers.
      }
      r = false; // Generally, for e-notation, we don't want rounding that hides the precise value.
    }
    
    return this.reducePrecision(
      numberString,
      p,
      d,
      r,
      c,
      f,
      template,
      language,
      outputFormat,
      prefixMarker,
      postfixMarker,
      prefix,
      postfix,
      thousandSeparator,
      decimalSeparator,
      originalInput
    );
  }
  
  private convertENotationToRegularNumber(eNotation: number): string {
    // For simple cases like 1e3, directly use Number constructor
    if (Number.isInteger(eNotation) && eNotation >= 1000) {
      return eNotation.toString();
    }
    
    const numStr = String(eNotation).toLowerCase();
    const parts = numStr.split('e');
    if (parts.length !== 2) return numStr;
    
    let coefficientStr = parts[0];
    const exponent = parseInt(parts[1], 10);

    // Handle cases like "1.23e-7"
    if (exponent < 0) {
        const absExponent = Math.abs(exponent);
        const decimalIndex = coefficientStr.indexOf('.');
        let digitsAfterDecimal = 0;
        if (decimalIndex !== -1) {
            digitsAfterDecimal = coefficientStr.length - decimalIndex - 1;
        }
        // toFixed needs total number of decimal places
        // For "1.23e-7", it becomes "0.000000123".
        // Number of zeros after decimal point before significant digits start is absExponent - 1 (if coefficient is like "1.23")
        // Total decimal places = (absExponent - 1 for leading zeros) + digitsAfterDecimal
        // However, toFixed is simpler: it just needs the number of digits *after the decimal point* in the final string.
        // For "1e-7", toFixed(7) -> "0.0000001"
        // For "1.23e-7", toFixed(7+2-1) -> toFixed(8) "0.00000012" (incorrect)
        // toFixed(absExponent + digitsAfterDecimal - (coefficientStr.startsWith('0.') ? 0 : 1 ))
        // Let's use a more robust way by converting to string with sufficient precision

        if (typeof eNotation.toFixed === 'function') {
            // Calculate number of decimal places needed
            let requiredPrecision = absExponent;
            if (decimalIndex !== -1) {
                requiredPrecision += digitsAfterDecimal;
                 // if coefficient is like "1.23", it means 1 whole digit, so it effectively shifts one less.
                 // if "0.123e-7", it's different.
            }
             // Max precision for toFixed is often around 20 for some JS engines,
             // but for numbers like 1e-30, we need more.
             // However, our internal `p` for high precision small numbers is 30.
            if (absExponent > 20 && digitsAfterDecimal === 0 && coefficientStr.indexOf('.') === -1) {
                 // For "1e-30", toFixed(30) is "0.000...1" (30 places)
                 return eNotation.toFixed(absExponent);
            } else if (absExponent + digitsAfterDecimal > 20) {
                // For "1.23e-30", toFixed(30+2) -> toFixed(32)
                // The maximum precision for `toFixed` can be up to 100 in modern engines.
                return eNotation.toFixed(Math.min(100, absExponent + digitsAfterDecimal));
            }
            return eNotation.toFixed(Math.min(100, requiredPrecision));
        }
    }
    
    // For positive exponents or numbers that don't need special toFixed handling for negative exponents
    // let JavaScript's default string conversion handle it.
    // This usually works well for numbers like 1e20.
    return eNotation.toString();
  }

  private reducePrecision(
    numberString: string,
    precision = 30,
    nonZeroDigits = 4,
    round = false,
    compress = false,
    fixedDecimalZeros = 0,
    template = 'number',
    language = 'en',
    outputFormat = 'plain',
    prefixMarker = 'span',
    postfixMarker = 'span',
    prefix = '',
    postfix = '',
    thousandSeparator = ',',
    decimalSeparator = '.',
    originalInput = ''
  ) {
    if (numberString === undefined || numberString === null || numberString.trim() === '') {
      return {} as FormattedObject;
    }

    // Handle negative zero
    if (numberString === '-0' || numberString === '-0.0') {
      numberString = numberString.substring(1); // Remove negative sign for zero
    }

    numberString = numberString.toString();

    let fractionalPartWasRounded = false; // Flag to track if rounding occurred
    let smallHighPrecisionOverrideApplied = false; // Flag for the 0.0...01 override

    const maxPrecision = 30;
    const maxIntegerDigits = 21;
    const scaleUnits = template.match(/^(number|percent)$/g)
      ? {
          '': '',
          K: ' هزار',
          M: ' میلیون',
          B: ' میلیارد',
          T: ' تریلیون',
          Qd: ' کادریلیون',
          Qt: ' کنتیلیون',
        }
      : {
          '': '',
          K: ' هزار ت',
          M: ' میلیون ت',
          B: ' میلیارد ت',
          T: ' همت',
          Qd: ' هزار همت',
          Qt: ' میلیون همت',
        };

    const fullScaleUnits = template.match(/^(number|percent)$/g)
      ? {
          '': '',
          K: ' هزار',
          M: ' میلیون',
          B: ' میلیارد',
          T: ' تریلیون',
          Qd: ' کادریلیون',
          Qt: ' کنتیلیون',
        }
      : {
          '': '',
          K: ' هزار تومان',
          M: ' میلیون تومان',
          B: ' میلیارد تومان',
          T: ' هزار میلیارد تومان',
          Qd: ' کادریلیون تومان',
          Qt: ' کنتیلیون تومان',
        };

    // Escape the decimalSeparator for use in the regex
    // The decimalSeparator parameter comes from this.options in the format method
    const decimalSepPattern = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const partsRegex = new RegExp(`^(-)?(\\d*)${decimalSepPattern}?([0]*)(\\d*)$`);
    let parts = partsRegex.exec(numberString);

    if (!parts) {
      return {} as FormattedObject;
    }

    const sign = parts[1] || '';
    let nonFractionalStr = parts[2];
    nonFractionalStr = nonFractionalStr || '0';
    let fractionalZeroStr = parts[3];
    let fractionalNonZeroStr = parts[4];
    let unitPrefix = '';
    let unitPostfix = '';

    // Special override for very small high-precision numbers to format as 0.0...01
    const highPrecisionSmallNumOverrideThreshold = 30;
    if (
      this.options.precision === 'high' &&
      nonFractionalStr === '0' &&
      fractionalZeroStr.length >= highPrecisionSmallNumOverrideThreshold &&
      (fractionalNonZeroStr === '' || parseInt(fractionalNonZeroStr) === 0 || fractionalNonZeroStr === '1')
    ) {
       fractionalZeroStr = ''.padEnd(highPrecisionSmallNumOverrideThreshold, '0');
       fractionalNonZeroStr = '1';
       smallHighPrecisionOverrideApplied = true;
    } else if (fractionalZeroStr.length >= maxPrecision) {
      // Number is smaller than maximum precision (original logic for non-override cases)
      fractionalZeroStr = '0'.padEnd(maxPrecision - 1, '0');
      fractionalNonZeroStr = '1';
    } else if (fractionalZeroStr.length + nonZeroDigits > precision) {
      // decrease non-zero digits
      nonZeroDigits = precision - fractionalZeroStr.length;
      if (nonZeroDigits < 1) nonZeroDigits = 1;
    } else if (nonFractionalStr.length > maxIntegerDigits) {
      nonFractionalStr = '0';
      fractionalZeroStr = '';
      fractionalNonZeroStr = '';
    }

    // compress large numbers
    if (compress && nonFractionalStr.length >= 4) {
      const scaleUnitKeys = Object.keys(scaleUnits);
      let scaledWholeNumber = nonFractionalStr;
      let unitIndex = 0;
      while (+scaledWholeNumber > 999 && unitIndex < scaleUnitKeys.length - 1) {
        scaledWholeNumber = (+scaledWholeNumber / 1000).toFixed(2);
        unitIndex++;
      }
      unitPostfix = scaleUnitKeys[unitIndex];
      parts = /^(-)?(\d+)\.?([0]*)(\d*)$/g.exec(scaledWholeNumber.toString());

      if (!parts) {
        return {} as FormattedObject;
      }

      // sign = parts[1] || "";
      nonFractionalStr = parts[2];
      fractionalZeroStr = parts[3];
      fractionalNonZeroStr = parts[4];
    }

    // Truncate the fractional part or round it
    if (!smallHighPrecisionOverrideApplied) { // Only apply standard rounding/truncation if override wasn't applied
      if (fractionalNonZeroStr.length > nonZeroDigits && nonZeroDigits >= 0) { // nonZeroDigits can be 0
        if (!round) {
          fractionalNonZeroStr = fractionalNonZeroStr.substring(0, nonZeroDigits);
        } else {
          // Check the digit at nonZeroDigits position for rounding
        // Ensure fractionalNonZeroStr[nonZeroDigits] is safe, default to '0' if undefined
        if (parseInt(fractionalNonZeroStr[nonZeroDigits] || '0') >= 5) {
          // Round up
          let numToRound = fractionalNonZeroStr.substring(0, nonZeroDigits);
          // Handle empty string for numToRound if nonZeroDigits is 0
          let roundedVal = (parseInt(numToRound || '0') + 1);

          let newFractionalPart = roundedVal.toString();

          if (nonZeroDigits === 0) { // rounding 0.xxx to 1.xxx or 0.xxx to 0 if it was < 0.5
            if (newFractionalPart !== '0') { // if it rounded up to 1 (from 0.5, 0.9 etc)
                 nonFractionalStr = (Number(nonFractionalStr) + Number(newFractionalPart)).toString();
                 fractionalNonZeroStr = ''; // Consumed by whole part
            } else { // it was < 0.5, so numToRound was '0', roundedVal is 1, but should be 0.
                 // This case means it was like 0.4 and nonZeroDigits is 0, so it should effectively be 0.
                 // The comparison parseInt(fractionalNonZeroStr[nonZeroDigits] || '0') >= 5 handles this.
                 // If it was < 5, it goes to the else block below.
                 // This path is for >= 5.
                 // Example: 0.5, nonZeroDigits = 0. digit is '5'. numToRound is "". roundedVal = 1. nonFractionalStr becomes old + 1. fractionalNonZeroStr = ""
                 fractionalNonZeroStr = ''; // It got rounded, this part is cleared or carried over.
            }
          } else if (newFractionalPart.length > nonZeroDigits) {
            // Overflow from fractional to whole part (e.g. 0.99 -> 1.00 with nonZeroDigits=1)
            // This means the part like "9" became "10"
            if (fractionalZeroStr.length > 0) {
              fractionalZeroStr = fractionalZeroStr.substring(0, fractionalZeroStr.length - 1);
              // Potentially need to handle cascading zeros if fractionalZeroStr becomes all non-zeros
            } else {
              nonFractionalStr = (Number(nonFractionalStr) + 1).toString();
            }
            // The newFractionalPart might be "10" if nonZeroDigits was 1 (e.g. rounding x.95 up)
            // We need to take the correct part of it.
            fractionalNonZeroStr = newFractionalPart.substring(newFractionalPart.length - nonZeroDigits);
          } else {
            // Normal rounding, no overflow to whole part, ensure leading zeros if needed
            fractionalNonZeroStr = newFractionalPart.padStart(nonZeroDigits, '0');
          }
          fractionalPartWasRounded = true;
        } else {
          // Truncate (digit is 0-4)
          fractionalNonZeroStr = fractionalNonZeroStr.substring(0, nonZeroDigits);
          // No need to set fractionalPartWasRounded = true for truncation,
          // as it's not a "rounding" modification in the sense of changing value up.
          // However, the spec implies any modification through this block could count.
          // Let's set it to true if any change happens in this `if (fractionalNonZeroStr.length > nonZeroDigits)` block.
          fractionalPartWasRounded = true; // Simplification: any path through here modifies based on nonZeroDigits.
        }
      }
    } else if (round && nonZeroDigits === 0 && parseInt(fractionalNonZeroStr[0] || '0') >= 5) {
      // Special case: rounding to 0 decimal places (nonZeroDigits = 0)
      // e.g. 0.5 should round to 1. fractionalNonZeroStr could be "5", "6", etc.
      nonFractionalStr = (Number(nonFractionalStr) + 1).toString();
      fractionalNonZeroStr = ''; // All fractional part is gone or carried over
      fractionalZeroStr = ''; // All fractional part is gone
      fractionalPartWasRounded = true;
    }
   } // End of if (!smallHighPrecisionOverrideApplied)

    // Using dex style
    if (compress && fractionalZeroStr !== '' && unitPostfix === '') {
      fractionalZeroStr =
        '0' +
        fractionalZeroStr.length.toString().replace(/\d/g, function (match) {
          return [
            '₀',
            '₁',
            '₂',
            '₃',
            '₄',
            '₅',
            '₆',
            '₇',
            '₈',
            '₉',
          ][parseInt(match, 10)];
        });
    }

    const hasSubscripts = /[₀₁₂₃₄₅₆₇₈₉]/.test(fractionalZeroStr);
    let fractionalPartStr : string;
    let baseFractionalValue = `${fractionalZeroStr}${fractionalNonZeroStr}`;

    if (fixedDecimalZeros > 0) {
        // If fixedDecimalZeros is set, it dictates the exact length of the fractional part.
        // The rounding based on nonZeroDigits has already occurred.
        // Now, format baseFractionalValue to fixedDecimalZeros length.
        if (baseFractionalValue.length > fixedDecimalZeros) {
            // Truncate if longer. Re-rounding could be an advanced feature here,
            // but current design assumes primary rounding was by nonZeroDigits.
            baseFractionalValue = baseFractionalValue.substring(0, fixedDecimalZeros);
        } else {
            baseFractionalValue = baseFractionalValue.padEnd(fixedDecimalZeros, '0');
        }
        fractionalPartStr = baseFractionalValue;
    } else if (hasSubscripts) {
        fractionalPartStr = baseFractionalValue; // Use the value with subscripts
    } else if (!fractionalPartWasRounded && originalInput.includes('.')) {
        // fixedDecimalZeros is not set (or is 0), and no subscripts.
        // No rounding occurred based on nonZeroDigits, try to preserve originalInput's decimal part.
        const originalDecimalPart = originalInput.split('.')[1] || '';
        fractionalPartStr = originalDecimalPart;
    } else {
        // fixedDecimalZeros is not set (or is 0), and no subscripts.
        // Either rounding occurred, or no decimal in originalInput.
        // Use the baseFractionalValue (which is already rounded if fractionalPartWasRounded is true).
        fractionalPartStr = baseFractionalValue;
    }

    // Final truncation based on `precision`
    // This applies regardless of how fractionalPartStr was formed (rounding or originalInput).
    // Now applies to e-notation results as well to ensure they adhere to $precision (max fractional length).
    if (fractionalPartStr.length > precision) {
      fractionalPartStr = fractionalPartStr.substring(0, precision);
    }

    // Output Formating, Prefix, Postfix
    if (template === 'usd') {
      unitPrefix = language === 'en' ? '$' : '';
      if (!unitPostfix) unitPostfix = language === 'fa' ? ' دلار' : '';
    } else if (template === 'irr') {
      if (!unitPostfix) unitPostfix = language === 'fa' ? ' ر' : ' R';
    } else if (template === 'irt') {
      if (!unitPostfix) unitPostfix = language === 'fa' ? ' ت' : ' T';
    } else if (template === 'percent') {
      if (language === 'en') {
        unitPostfix += '%';
      } else {
        unitPostfix += !unitPostfix ? '٪' : ' درصد';
      }
    }
    unitPrefix = prefix + unitPrefix;
    unitPostfix += postfix;
    if (outputFormat === 'html') {
      if (unitPrefix)
        unitPrefix = `<${prefixMarker}>${unitPrefix}</${prefixMarker}>`;
      if (unitPostfix)
        unitPostfix = `<${postfixMarker}>${unitPostfix}</${postfixMarker}>`;
    } else if (outputFormat === 'markdown') {
      if (unitPrefix)
        unitPrefix = `${prefixMarker}${unitPrefix}${prefixMarker}`;
      if (unitPostfix)
        unitPostfix = `${postfixMarker}${unitPostfix}${postfixMarker}`;
    }

    const thousandSeparatorRegex = /\B(?=(\d{3})+(?!\d))/g;
    let out = '';
    let wholeNumberStr;

    const formattedNonFractionalStr = nonFractionalStr.replace(thousandSeparatorRegex, thousandSeparator);

    if (originalInput.includes('.')) {
      const endsWithDecimal = originalInput.endsWith('.');
      if (fractionalPartStr === '' && !endsWithDecimal) {
        // Input like "123" (no decimal in original, but somehow fractionalPartStr is empty now)
        // or input like "123.0" and fractionalPartStr became ""
        // We should not add a decimal point if original didn't imply it or fractional part is truly zero.
        wholeNumberStr = formattedNonFractionalStr;
        // if fixedDecimalZeros is set and originalInput didn't have a decimal, it's handled above
      } else {
        // Handles "123.45", "123.", ".45"
        // If endsWithDecimal is true (e.g. "123."), fractionalPartStr might be "" but we still want the separator.
        wholeNumberStr = `${formattedNonFractionalStr}${decimalSeparator}${fractionalPartStr}`;
      }
    } else {
      // originalInput does not contain "."
      if (fractionalPartStr.length > 0) {
        wholeNumberStr = `${formattedNonFractionalStr}${decimalSeparator}${fractionalPartStr}`;
      } else if (fixedDecimalZeros > 0) {
        // This case is now handled by fractionalPartStr padding logic if originalInput has no decimal
        wholeNumberStr = `${formattedNonFractionalStr}${decimalSeparator}${ ''.padEnd(fixedDecimalZeros, '0')}`;
      }
      else {
        wholeNumberStr = formattedNonFractionalStr;
      }
    }

    out = `${sign}${unitPrefix}${wholeNumberStr}${unitPostfix}`;

    const formattedObject: FormattedObject = {
      value: out,
      prefix: unitPrefix,
      postfix: unitPostfix,
      sign: sign,
      wholeNumber: wholeNumberStr,
    };

    // replace custom config --千分位和自定义小数分隔符已经提前处理
    // formattedObject.value = (formattedObject?.value ?? '')
    //   .replace(/,/g, thousandSeparator) // Thousand separators are applied in wholeNumberStr construction
    //   .replace(/\./g, decimalSeparator); // Decimal separator is applied in wholeNumberStr construction

    // Ensure the final value uses the correct decimal separator if not already applied
    // This is more of a safeguard, as logic above should handle it.
    if (language === 'fa' && decimalSeparator === '٬') {
       // For FA, ensure dot is replaced if it somehow slipped through, though wholeNumberStr should use decimalSeparator
       formattedObject.value = (formattedObject.value ?? '').replace(/\./g, decimalSeparator);
    } else if (decimalSeparator !== '.') {
       // For any custom decimal separator other than '.', ensure it's correctly applied.
       // This mainly catches cases where default '.' might have been used if logic branches were missed.
       // The construction of wholeNumberStr should ideally prevent this.
       formattedObject.value = (formattedObject.value ?? '').replace(/\./g, decimalSeparator);
    }
    // Thousand separators are already applied to nonFractionalStr before this point.

    // Convert output to Persian numerals if language is "fa"
    // Also, ensure that the decimalSeparator for 'fa' is correctly used if it was temporarily a '.'
    if (language === 'fa') {
      let val = formattedObject.value ?? '';
      // If English decimal separator was used due to direct originalInput copy, replace it.
      if (decimalSeparator === '٬') { //Specific for fa
        val = val.replace(/\./g, decimalSeparator);
      }
      val = val.replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 1728))
        .replace(/(K|M|B|T|Qt|Qd)/g, function (c: string) {
          return String(scaleUnits[c as keyof typeof scaleUnits]);
        });
      formattedObject.value = val;

      // Apply to other parts as well
      let faWholeNumber = formattedObject.wholeNumber;
      if (decimalSeparator === '٬') {
        faWholeNumber = faWholeNumber.replace(/\./g, decimalSeparator);
      }
      formattedObject.wholeNumber = faWholeNumber
        .replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 1728))
        .replace(/(K|M|B|T|Qt|Qd)/g, function (c: string) {
          return String(scaleUnits[c as keyof typeof scaleUnits]);
        });

      formattedObject.fullPostfix = unitPostfix
        .replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 1728))
        .replace(/(K|M|B|T|Qt|Qd)/g, function (c: string) {
          return String(fullScaleUnits[c as keyof typeof fullScaleUnits]);
        });

      formattedObject.postfix = formattedObject.postfix
        .replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 1728))
        .replace(/(K|M|B|T|Qt|Qd)/g, function (c: string) {
          return String(scaleUnits[c as keyof typeof scaleUnits]);
        });
    } else {
      // Ensure correct decimal separator for non-'fa' languages if it's not '.'
      if (decimalSeparator !== '.') {
        formattedObject.value = (formattedObject.value ?? '').replace(/\./g, decimalSeparator);
        formattedObject.wholeNumber = formattedObject.wholeNumber.replace(/\./g, decimalSeparator);
      }
    }


    return formattedObject;
  }
}

export default NumberFormatter;