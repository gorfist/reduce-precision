<?php
// v1.0.7 - Fixed version
namespace NumberFormatter;

class NumberFormatter
{
    private $options;
    private $languageBaseConfig = [
        'prefixMarker' => 'i',
        'postfixMarker' => 'i',
        'prefix' => '',
        'postfix' => '',
    ];

    private $defaultLanguageConfig = [
        'en' => [
            'thousandSeparator' => ',',
            'decimalSeparator' => '.',
        ],
        'fa' => [
            'thousandSeparator' => '٬', // Corrected Farsi thousand separator
            'decimalSeparator' => '٫', // Corrected Farsi decimal separator
        ],
    ];

    public function __construct($options = [])
    {
        // Initialize defaultLanguageConfig by merging base for each language
        $this->defaultLanguageConfig['en'] = array_merge($this->languageBaseConfig, $this->defaultLanguageConfig['en']);
        $this->defaultLanguageConfig['fa'] = array_merge($this->languageBaseConfig, $this->defaultLanguageConfig['fa']);

        // Start with default options (which includes 'en' specific settings)
        $newOptions = array_merge([
            'language' => 'en',
            'template' => 'number',
            'precision' => 'high',
            'outputFormat' => 'plain',
        ], $this->defaultLanguageConfig['en']);

        // If a language is specified in the incoming options,
        // apply the defaults for that language first.
        if (isset($options['language']) && isset($this->defaultLanguageConfig[$options['language']])) {
            $langDefaults = $this->defaultLanguageConfig[$options['language']];
            // Merge general lang defaults, then ensure the specified language itself is set, then merge specific options for that lang from $options
            $newOptions = array_merge($newOptions, $langDefaults, ['language' => $options['language']]);
        }

        // Then, apply all incoming options, allowing them to override.
        // This ensures that options like 'prefix', 'postfix', etc. from $options override language defaults if provided.
        $this->options = array_merge($newOptions, $options);
    }

    public function setLanguage($lang, $config = [])
    {
        $this->options['language'] = $lang;
        // Fallback to 'en' if the specified language or its defaults aren't fully defined.
        // Ensure defaultLanguageConfig has been initialized (e.g. by constructor having run)
        if (!isset($this->defaultLanguageConfig[$lang]) || !is_array($this->defaultLanguageConfig[$lang])) {
             // This case should ideally not happen if languages are pre-configured in constructor
            $langDefaults = $this->defaultLanguageConfig['en'];
        } else {
            $langDefaults = $this->defaultLanguageConfig[$lang];
        }
        // Ensure 'en' defaults are complete if somehow accessed before full constructor merge for 'en'
        // (though constructor order should prevent this)
        if ($lang === 'en' && ( !isset($this->defaultLanguageConfig['en']['prefixMarker']) || $this->defaultLanguageConfig['en']['prefixMarker'] === null ) ){
             $this->defaultLanguageConfig['en'] = array_merge($this->languageBaseConfig, $this->defaultLanguageConfig['en']);
             $langDefaults = $this->defaultLanguageConfig['en'];
        }


        $this->options['prefixMarker'] = $config['prefixMarker'] ?? $langDefaults['prefixMarker'];
        $this->options['postfixMarker'] = $config['postfixMarker'] ?? $langDefaults['postfixMarker'];
        $this->options['prefix'] = $config['prefix'] ?? $langDefaults['prefix'];
        $this->options['postfix'] = $config['postfix'] ?? $langDefaults['postfix'];
        $this->options['thousandSeparator'] = $config['thousandSeparator'] ?? $langDefaults['thousandSeparator'];
        $this->options['decimalSeparator'] = $config['decimalSeparator'] ?? $langDefaults['decimalSeparator'];
        return $this;
    }

    public function setTemplate($template, $precision)
    {
        $this->options['template'] = $template;
        $this->options['precision'] = $precision;
        return $this;
    }

    public function toJson($input)
    {
        $formattedObject = $this->format($input);
        unset($formattedObject['value']);
        return $formattedObject;
    }

    public function toString($input)
    {
        $formattedObject = $this->format($input);
        return $formattedObject['value'] ?? '';
    }

    public function toPlainString($input)
    {
        $this->options['outputFormat'] = 'plain';
        $formattedObject = $this->format($input);
        return $formattedObject['value'] ?? '';
    }

    public function toHtmlString($input)
    {
        $this->options['outputFormat'] = 'html';
        $formattedObject = $this->format($input);
        return $formattedObject['value'] ?? '';
    }

    public function toMdString($input)
    {
        $this->options['outputFormat'] = 'markdown';
        $formattedObject = $this->format($input);
        return $formattedObject['value'] ?? '';
    }

    // FIXED: Updated regex to handle both positive and negative exponents
    private function isENotation($input)
    {
        return preg_match('/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)$/', $input);
    }

    private function format($input)
    {
        $precision = $this->options['precision'];
        $template = $this->options['template'];
        $language = $this->options['language'];
        $outputFormat = $this->options['outputFormat'];
        $prefixMarker = $this->options['prefixMarker'];
        $postfixMarker = $this->options['postfixMarker'];
        $prefix = $this->options['prefix'];
        $postfix = $this->options['postfix'];

        // Check if the input is null or empty but not 0
        if ($input === null || $input === '') {
            return [];
        }

        // Store original input string to preserve format for trailing zeros
        $originalInput = (string)$input;

        if (!preg_match('/^(number|usd|irt|irr|percent)$/i', $template)) {
            $template = 'number';
        }

        if ($this->isENotation((string)$input)) {
            $input = $this->convertENotationToRegularNumber((float)$input, $originalInput);
        }

        $numberString = (string)$input;
        // Convert Persian/Arabic numerals to English numerals first
        $numberString = preg_replace_callback('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', function ($match) {
            return mb_chr(ord($match[0]) - 1728);
        }, $numberString);

        // Get the configured decimal separator, defaulting to '.'
        $currentDecimalSeparator = $this->options['decimalSeparator'] ?? '.';

        if (($this->options['language'] ?? 'en') === 'fa') {
            // For Persian, explicitly replace all English dots with the Persian decimal separator.
            // This allows users to type '.' and have it treated as the configured Persian separator (e.g., '٫').
            $numberString = str_replace('.', $currentDecimalSeparator, $numberString);
        }

        // Sanitize the numberString:
        // Keep only digits, the currentDecimalSeparator, and the hyphen.
        // preg_quote is used to escape the decimal separator if it's a special regex character.
        $numberString = preg_replace('/[^\d' . preg_quote($currentDecimalSeparator, '/') . '-]/u', '', $numberString);

        // Stripping leading zeros only, preserve trailing zeros
        $numberString = preg_replace('/^0+(?=\d)/', '', $numberString);

        $number = abs((float)$numberString);

        $p = $d = $r = $c = $f = 0;

        // Auto precision selection
        if ($precision === 'auto') {
            if (preg_match('/^(usd|irt|irr|number)$/i', $template)) { // Added 'number'
                // Threshold might need adjustment later based on full CSV analysis, 100_000_000_000 is from TS
                if ($number >= 0.0001 && $number < 100000000000) {
                    $precision = 'high';
                } else {
                    $precision = 'medium';
                }
            } elseif ($template === 'percent') {
                $precision = 'low';
            }
            // Removed redundant: elseif ($template === 'number') { $precision = 'medium'; }
        }

        if ($precision === 'medium') {
            if ($number >= 0 && $number < 0.0001) { // Subscript formatting for very small numbers
                $p = 33;
                $d = 4;
                $r = false;
                $c = true;
            } elseif ($number >= 0.0001 && $number < 0.001) {
                $p = 7;
                $d = 4;
                $r = false;
                $c = false;
            } elseif ($number >= 0.001 && $number < 0.01) {
                $p = 5;
                $d = 3;
                $r = false;
                $c = false;
            } elseif ($number >= 0.01 && $number < 0.1) { // Corrected non-overlapping condition from TS logic
                $p = 3;
                $d = 2;
                $r = false;
                $c = false;
            } elseif ($number >= 0.1 && $number < 1) {
                $p = 1;
                $d = 1;
                $r = false;
                $c = false;
            } elseif ($number >= 1 && $number < 10) {
                $p = 3;
                $d = 3;
                $r = false;
                $c = false;
            } elseif ($number >= 10 && $number < 100) {
                $p = 2;
                $d = 2;
                $r = false;
                $c = false;
            } elseif ($number >= 100 && $number < 1000) {
                $p = 1;
                $d = 1;
                $r = false;
                $c = false;
            } elseif ($number >= 1000) {
                $x = floor(log10($number)) % 3;
                $p = 2 - $x;
                $d = $p; // d should be equal to p
                $r = true;
                $c = true;
            } else {
                $p = 0;
                $d = 0;
                $r = true;
                $c = true;
            }
        } elseif ($precision === 'low') {
            if ($number >= 0 && $number < 0.01) { // to get 0.00
                $p = 4; // Existing value
                $d = 2; // Existing value
                $r = true; // Existing value
                $c = false; // Existing value
                $f = 2; // Important for 0.00
            } elseif ($number >= 0.01 && $number < 0.1) {
                $p = 2;
                $d = 1;
                $r = true;
                $c = false;
            } elseif ($number >= 0.1 && $number < 1) {
                $p = 2;
                $d = 2;
                $r = true;
                $c = false;
            } elseif ($number >= 1 && $number < 10) { // e.g. x.xx
                $p = 2; // Existing value
                $d = 2; // Existing value
                $r = true; // Existing value
                $c = false; // Existing value
                $f = 2; // Important
            } elseif ($number >= 10 && $number < 100) { // e.g. xx.x
                $p = 1; // Existing value
                $d = 1; // Existing value
                $r = true; // Existing value
                $c = false; // Existing value
                $f = 1; // Important
            } elseif ($number >= 100 && $number < 1000) {
                $p = 0;
                $d = 0;
                $r = true;
                $c = false;
            } elseif ($number >= 1000) {
                $x = floor(log10($number)) % 3;
                $p = max(0, 1 - $x); // Ensures 1 or 2 significant figures, prevents negative p
                $d = $p; // d should be equal to p
                $r = true;
                $c = true;
            } else {
                $p = 0;
                $d = 0;
                $r = true;
                $c = true;
                $f = 2; // Default from existing
            }
        } else { // $precision === "high"
            if ($number >= 0 && $number < 0.0001) { // very small numbers
                $p = 40; // max fractional length for reducePrecision
                $d = 4;  // significant digits to keep after leading zeros
                $r = false;
                $c = false;
            } elseif ($number >= 0.0001 && $number < 1) {
                $p = 7;  // Aim for up to 7 decimal places
                $d = 7;
                $r = true;
                $c = false;
            } elseif ($number >= 1 && $number < 1000000) { // numbers that shouldn't typically be compressed
                $p = 5;  // Aim for up to 5 decimal places
                $d = 5;
                $r = true;
                $c = false; // No compression
            } elseif ($number >= 1000000) {
                // For very large numbers in 'high' precision, show more detail, no compression.
                $p = 15; // Increased precision
                $d = 15; // Increased decimal places
                $r = true;
                $c = false; // No compression for high precision
            } else { // Default for 'high' if no other condition met
                $p = 7;
                $d = 7;
                $r = true;
                $c = false;
            }
        }

        // For scientific notation, adjust settings similar to TypeScript
        if ($this->isENotation($originalInput)) {
            if ($precision === 'high' && $number > 0 && $number < 0.0001) {
                // p is already 30, d is 6, r is false. This is generally good for e-notation small numbers.
            } else {
                 $p = max($p, 20);
            }
            $r = false; // Generally, for e-notation, we don't want rounding that hides the precise value.
        }

        return $this->reducePrecision(
            $numberString, 
            $p, 
            $d, 
            $r, 
            $c, 
            $f, 
            $template, 
            $language, 
            $outputFormat, 
            $prefixMarker, 
            $postfixMarker, 
            $prefix, 
            $postfix,
            $originalInput
        );
    }

    private function reducePrecision(
        $numberString, 
        $precision = 30, 
        $nonZeroDigits = 4, 
        $round = false, 
        $compress = false, 
        $fixedDecimalZeros = 0, 
        $template = 'number', 
        $language = 'en', 
        $outputFormat = 'plain', 
        $prefixMarker = 'span', 
        $postfixMarker = 'span', 
        $prefix = '', 
        $postfix = '',
        $originalInput = ''
    ) {
        if ($numberString === null || (is_string($numberString) && trim($numberString) === '')) {
            return [];
        }
        // Ensure numberString is a string for subsequent operations
        $numberString = (string)$numberString;

        $fractionalPartWasRounded = false; // Flag to track if rounding occurred
        $smallHighPrecisionOverrideApplied = false; // Flag for the 0.0...01 override

        // FIXED: Handle negative zero
        if ($numberString === '-0' || $numberString === '-0.0') {
            $numberString = substr($numberString, 1); // Remove negative sign for zero
        }

        $maxPrecision = 30;
        $maxIntegerDigits = 21;

        $scaleUnits = preg_match('/^(number|percent)$/i', $template)
            ? [
                '' => '',
                'K' => ' هزار',
                'M' => ' میلیون',
                'B' => ' میلیارد',
                'T' => ' تریلیون',
                'Qd' => ' کادریلیون',
                'Qt' => ' کنتیلیون',
            ]
            : [
                '' => '',
                'K' => ' هزار ت',
                'M' => ' میلیون ت',
                'B' => ' میلیارد ت',
                'T' => ' همت',
                'Qd' => ' هزار همت',
                'Qt' => ' میلیون همت',
            ];

        // Add fullScaleUnits, similar to ts/js
        $fullScaleUnits = preg_match('/^(number|percent)$/i', $template)
          ? [
                '' => '', 'K' => ' هزار', 'M' => ' میلیون', 'B' => ' میلیارد',
                'T' => ' تریلیون', 'Qd' => ' کادریلیون', 'Qt' => ' کنتیلیون',
            ]
          : [
                '' => '', 'K' => ' هزار تومان', 'M' => ' میلیون تومان', 'B' => ' میلیارد تومان',
                'T' => ' هزار میلیارد تومان', 'Qd' => ' کادریلیون تومان', 'Qt' => ' کنتیلیون تومان',
            ];

        $parts = [];
        // Fetch the decimal separator from options, default to '.'
        $optionsDecimalSeparator = $this->options['decimalSeparator'] ?? '.';
        // Escape the decimal separator for use in regex
        $decimalSepPattern = preg_quote($optionsDecimalSeparator, '/');
        // Dynamically construct the regex for parsing parts
        preg_match('/^(-)?(\\d*)' . $decimalSepPattern . '?([0]*)(\\d*)$/u', $numberString, $parts);

        if (empty($parts)) {
            // This case should ideally not be reached if numberString is validated,
            // but as a fallback.
            return [];
        }

        $sign = $parts[1] ?? '';
        $nonFractionalStr = $parts[2] ?? '';
        if ($nonFractionalStr === '') {
            $nonFractionalStr = '0';
        }
        $fractionalZeroStr = $parts[3] ?? '';
        $fractionalNonZeroStr = $parts[4] ?? '';

        $unitPrefix = '';
        $unitPostfix = '';

        // Special override for very small high-precision numbers to format as 0.0...01
        $highPrecisionSmallNumOverrideThreshold = 30;
        if (
            isset($this->options['precision']) && $this->options['precision'] === 'high' &&
            $nonFractionalStr === '0' &&
            strlen($fractionalZeroStr) >= $highPrecisionSmallNumOverrideThreshold &&
            ($fractionalNonZeroStr === '' || (int)$fractionalNonZeroStr === 0 || $fractionalNonZeroStr === '1')
        ) {
           $fractionalZeroStr = str_pad('', $highPrecisionSmallNumOverrideThreshold, '0');
           $fractionalNonZeroStr = '1';
           $smallHighPrecisionOverrideApplied = true;
        } elseif (strlen($fractionalZeroStr) >= $maxPrecision) {
            // Number is smaller than maximum precision (original logic for non-override cases)
            $fractionalZeroStr = str_pad('', $maxPrecision - 1, '0');
            $fractionalNonZeroStr = '1';
        } elseif (strlen($fractionalZeroStr) + $nonZeroDigits > $precision) {
            // decrease non-zero digits
            $nonZeroDigits = $precision - strlen($fractionalZeroStr);
            if ($nonZeroDigits < 1) {
                $nonZeroDigits = 1;
            }
        } elseif (strlen($nonFractionalStr) > $maxIntegerDigits) {
            $nonFractionalStr = '0';
            $fractionalZeroStr = '';
            $fractionalNonZeroStr = '';
        }

        // compress large numbers
        if ($compress && strlen($nonFractionalStr) >= 4) {
            $scaleUnitKeys = array_keys($scaleUnits);
            $scaledWholeNumber = $nonFractionalStr;
            $unitIndex = 0;
            while ((int)$scaledWholeNumber > 999 && $unitIndex < count($scaleUnitKeys) - 1) {
                $scaledWholeNumber = number_format((float)$scaledWholeNumber / 1000, 2, '.', '');
                $unitIndex++;
            }
            $unitPostfix = $scaleUnitKeys[$unitIndex];

            if ($language == 'fa') {
                $unitPostfix = $scaleUnits[$scaleUnitKeys[$unitIndex]];
            }

            preg_match('/^(-)?(\d+)\.?([0]*)(\d*)$/u', $scaledWholeNumber, $parts);
            if (empty($parts)) {
                return [];
            }
            $nonFractionalStr = $parts[2];
            $fractionalZeroStr = $parts[3];
            $fractionalNonZeroStr = $parts[4];
        }

        // Truncate the fractional part or round it
        if (!$smallHighPrecisionOverrideApplied) { // Only apply standard rounding/truncation if override wasn't applied
            if (strlen($fractionalNonZeroStr) > $nonZeroDigits && $nonZeroDigits >= 0) { // nonZeroDigits can be 0
                if (!$round) {
                    $fractionalNonZeroStr = substr($fractionalNonZeroStr, 0, $nonZeroDigits);
                } else {
                    // Check the digit at nonZeroDigits position for rounding
                // Ensure $fractionalNonZeroStr[$nonZeroDigits] is safe, default to '0' if not set
                $digitForRounding = $fractionalNonZeroStr[$nonZeroDigits] ?? '0';

                if ((int)$digitForRounding >= 5) {
                    // Round up
                    $numToRound = substr($fractionalNonZeroStr, 0, $nonZeroDigits);
                    // Handle empty string for $numToRound if $nonZeroDigits is 0
                    $roundedVal = (int)($numToRound === '' ? '0' : $numToRound) + 1;

                    $newFractionalPart = (string)$roundedVal;

                    if ($nonZeroDigits === 0) {
                        if ($newFractionalPart !== '0') { // if it rounded up to 1 (from 0.5, 0.9 etc)
                            $nonFractionalStr = (string)((float)$nonFractionalStr + (float)$newFractionalPart);
                            $fractionalNonZeroStr = ''; // Consumed by whole part
                        } else {
                            $fractionalNonZeroStr = ''; // It got rounded, this part is cleared or carried over.
                        }
                    } elseif (strlen($newFractionalPart) > $nonZeroDigits) {
                        // Overflow from fractional to whole part
                        if (strlen($fractionalZeroStr) > 0) {
                            $fractionalZeroStr = substr($fractionalZeroStr, 0, -1);
                        } else {
                            $nonFractionalStr = (string)((float)$nonFractionalStr + 1);
                        }
                        $fractionalNonZeroStr = substr($newFractionalPart, strlen($newFractionalPart) - $nonZeroDigits);
                    } else {
                        // Normal rounding, no overflow to whole part, ensure leading zeros if needed
                        $fractionalNonZeroStr = str_pad($newFractionalPart, $nonZeroDigits, '0', STR_PAD_LEFT);
                    }
                    $fractionalPartWasRounded = true;
                } else {
                    // Truncate (digit is 0-4)
                    $fractionalNonZeroStr = substr($fractionalNonZeroStr, 0, $nonZeroDigits);
                    $fractionalPartWasRounded = true; // Simplification: any path through here modifies based on nonZeroDigits.
                }
            }
        } elseif ($round && $nonZeroDigits === 0 && isset($fractionalNonZeroStr[0]) && (int)($fractionalNonZeroStr[0]) >= 5) {
             // Special case: rounding to 0 decimal places (nonZeroDigits = 0)
             // e.g. 0.5 should round to 1.
            $nonFractionalStr = (string)((float)$nonFractionalStr + 1);
            $fractionalNonZeroStr = ''; // All fractional part is gone or carried over
            $fractionalZeroStr = ''; // All fractional part is gone
            $fractionalPartWasRounded = true;
        }
        } // End of if (!$smallHighPrecisionOverrideApplied)

        // Using dex style
        if ($compress && $fractionalZeroStr !== '' && $unitPostfix === '') {
            $fractionalZeroStr = '0' . preg_replace_callback('/\d/', function ($match) {
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
                ][$match[0]];
            }, (string)strlen($fractionalZeroStr));
        }

        $hasSubscripts = preg_match('/[₀₁₂₃₄₅₆₇₈₉]/u', $fractionalZeroStr) === 1;
        $fractionalPartStr = '';
        $baseFractionalValue = $fractionalZeroStr . $fractionalNonZeroStr;

        if ($fixedDecimalZeros > 0) {
            // If fixedDecimalZeros is set, it dictates the exact length of the fractional part.
            if (strlen($baseFractionalValue) > $fixedDecimalZeros) {
                // Truncate if longer.
                $baseFractionalValue = substr($baseFractionalValue, 0, $fixedDecimalZeros);
            } else {
                $baseFractionalValue = str_pad($baseFractionalValue, $fixedDecimalZeros, '0', STR_PAD_RIGHT);
            }
            $fractionalPartStr = $baseFractionalValue;
        } else if ($hasSubscripts) {
            $fractionalPartStr = $baseFractionalValue; // Use the value with subscripts
        } elseif (!$fractionalPartWasRounded && strpos($originalInput, '.') !== false) {
            // fixedDecimalZeros is not set (or is 0), and no subscripts.
            // No rounding occurred based on nonZeroDigits, try to preserve originalInput's decimal part.
            $originalDecimalPart = explode('.', $originalInput, 2)[1] ?? '';
            $fractionalPartStr = $originalDecimalPart;
            // The specific sub-condition for percent template with originalInput ending in '.'
            // and fixedDecimalZeros > 0 was here. If it's still needed, it would imply that
            // even if fixedDecimalZeros is not the primary driver (outer if), it might still
            // influence this path. However, that seems unlikely given the current structure.
            // The original logic: if (substr($originalInput, -1) === '.' && $originalDecimalPart === '' && $fixedDecimalZeros > 0 && $template === 'percent')
            // This will be false here if $fixedDecimalZeros = 0.
            // If $fixedDecimalZeros > 0, the first `if` block is taken.
            // So, this special case seems to be covered or no longer applies in this branch.
        } else {
            // fixedDecimalZeros is not set (or is 0), and no subscripts.
            // Either rounding occurred, or no decimal in originalInput.
            // Use the baseFractionalValue (which is already rounded if fractionalPartWasRounded is true).
            $fractionalPartStr = $baseFractionalValue;
        }

        // Final truncation based on $precision
        // This applies regardless of how $fractionalPartStr was formed (rounding or originalInput).
        // Now applies to e-notation results as well to ensure they adhere to $precision (max fractional length).
        if (strlen($fractionalPartStr) > $precision) {
            $fractionalPartStr = substr($fractionalPartStr, 0, $precision);
        }

        // Output Formating, Prefix, Postfix
        if ($template === 'usd') {
            $unitPrefix = $language === 'en' ? '$' : '';
            if (!$unitPostfix) {
                $unitPostfix = $language === 'fa' ? ' دلار' : '';
            }
        } elseif ($template === 'irr') {
            if (!$unitPostfix) {
                $unitPostfix = $language === 'fa' ? ' ر' : ' R';
            }
        } elseif ($template === 'irt') {
            if (!$unitPostfix) {
                $unitPostfix = $language === 'fa' ? ' ت' : ' T';
            }
        } elseif ($template === 'percent') {
            if ($language === 'en') {
                $unitPostfix .= '%';
            } else {
                $unitPostfix .= !$unitPostfix ? '٪' : ' درصد';
            }
        }
        $unitPrefix = $prefix . $unitPrefix;
        $unitPostfix .= $postfix;

        if ($outputFormat === 'html') {
            if ($unitPrefix) {
                $unitPrefix = '<' . $prefixMarker . '>' . $unitPrefix . '</' . $prefixMarker . '>';
            }
            if ($unitPostfix) {
                $unitPostfix = '<' . $postfixMarker . '>' . $unitPostfix . '</' . $postfixMarker . '>';
            }
        } elseif ($outputFormat === 'markdown') {
            if ($unitPrefix) {
                $unitPrefix = $prefixMarker . $unitPrefix . $prefixMarker;
            }
            if ($unitPostfix) {
                $unitPostfix = $postfixMarker . $unitPostfix . $postfixMarker;
            }
        }

        // Fetch separators from $this->options
        $optionsThousandSeparator = $this->options['thousandSeparator'] ?? ',';
        $optionsDecimalSeparator = $this->options['decimalSeparator'] ?? '.';

        // Convert $nonFractionalStr to float for number_format, then to string.
        // number_format will use standard English comma for thousands if a separator isn't specified for it.
        // We want to apply the $optionsThousandSeparator.
        // The easiest way to apply a custom thousand separator is often string replacement after formatting with a placeholder,
        // or by formatting without a thousand separator and then manually inserting it.
        // For simplicity with number_format, we format without its own thousands, then add ours.
        // However, the provided TS/JS logic implies direct construction.
        // Let's use number_format for the number part, then replace.

        // First, ensure $nonFractionalStr is just digits for number_format if it's being used for formatting the number itself.
        // Or, more simply, apply thousand separator using regex substitution if $nonFractionalStr is already prepared.
        $tempFormattedNonFractionalStr = preg_replace('/\B(?=(\d{3})+(?!\d))/', '$PLACEHOLDER$', $nonFractionalStr);
        $formattedNonFractionalStr = str_replace('$PLACEHOLDER$', $optionsThousandSeparator, $tempFormattedNonFractionalStr);

        if ($nonFractionalStr === '0' && $originalInput !== '' && $originalInput[0] === '.') {
           $formattedNonFractionalStr = '0';
        }
        
        $wholeNumberStr = '';
        if (strpos($originalInput, '.') !== false) {
            $endsWithDecimal = substr($originalInput, -1) === '.';
            if ($fractionalPartStr === '' && !$endsWithDecimal) {
                $wholeNumberStr = $formattedNonFractionalStr;
            } else {
                $wholeNumberStr = $formattedNonFractionalStr . $optionsDecimalSeparator . $fractionalPartStr;
            }
        } else {
            // originalInput does not contain "."
            if (strlen($fractionalPartStr) > 0) {
                $wholeNumberStr = $formattedNonFractionalStr . $optionsDecimalSeparator . $fractionalPartStr;
            } elseif ($fixedDecimalZeros > 0) {
                $wholeNumberStr = $formattedNonFractionalStr . $optionsDecimalSeparator . str_pad('', $fixedDecimalZeros, '0');
            } else {
                $wholeNumberStr = $formattedNonFractionalStr;
            }
        }

        $out = $sign . $unitPrefix . $wholeNumberStr . $unitPostfix;

        $formattedObject = [
            'value' => $out,
            'prefix' => $unitPrefix,
            'postfix' => $unitPostfix,
            'sign' => $sign,
            'wholeNumber' => $wholeNumberStr,
        ];

        // Final Separator Replacement and Persian Conversion
        // $optionsDecimalSeparator and $optionsThousandSeparator are already fetched

        // Ensure the final value uses the correct decimal separator.
        // $wholeNumberStr is already built with correct separators.
        // $out uses $wholeNumberStr. So $formattedObject['value'] (which is $out) should be mostly correct.
        // This is a final check for cases where '.' might have been introduced if logic above missed something.
        if ($language === 'fa' && $optionsDecimalSeparator === '٬') {
           $formattedObject['value'] = str_replace('.', $optionsDecimalSeparator, $formattedObject['value'] ?? '');
        } elseif ($optionsDecimalSeparator !== '.') {
           $formattedObject['value'] = str_replace('.', $optionsDecimalSeparator, $formattedObject['value'] ?? '');
        }
        // Thousand separators were applied during $formattedNonFractionalStr creation.

        if ($language === 'fa') {
            $val = $formattedObject['value'] ?? '';
            // Ensure correct decimal separator for 'fa' before converting numerals
            if ($optionsDecimalSeparator === '٬') {
                $val = str_replace('.', $optionsDecimalSeparator, $val); // Ensure conversion if originalInput had '.'
            }
            $val = preg_replace_callback('/[0-9]/', function ($m) { return mb_chr(ord($m[0]) + 1728); }, $val);
            // $scaleUnits should be available from earlier in the function
            $val = preg_replace_callback('/(K|M|B|T|Qt|Qd)/', function ($m) use ($scaleUnits) { return $scaleUnits[$m[0]] ?? $m[0]; }, $val);
            $formattedObject['value'] = $val;

            $faWholeNumber = $formattedObject['wholeNumber'];
            if ($optionsDecimalSeparator === '٬') {
                $faWholeNumber = str_replace('.', $optionsDecimalSeparator, $faWholeNumber);
            }
            $formattedObject['wholeNumber'] = preg_replace_callback('/[0-9]/', function ($m) { return mb_chr(ord($m[0]) + 1728); }, $faWholeNumber);
            // No K,M,B in wholeNumber typically

            // Add fullPostfix similar to TS
            // $fullScaleUnits should be available from earlier in the function
            $formattedObject['fullPostfix'] = preg_replace_callback('/[0-9]/', function ($m) { return mb_chr(ord($m[0]) + 1728); }, $unitPostfix); // $unitPostfix is set earlier
            $formattedObject['fullPostfix'] = preg_replace_callback('/(K|M|B|T|Qt|Qd)/', function ($m) use ($fullScaleUnits) { return $fullScaleUnits[$m[0]] ?? $m[0]; }, $formattedObject['fullPostfix']);

            $currentPostfix = $formattedObject['postfix'] ?? '';
            $currentPostfix = preg_replace_callback('/[0-9]/', function ($m) { return mb_chr(ord($m[0]) + 1728); }, $currentPostfix);
            $formattedObject['postfix'] = preg_replace_callback('/(K|M|B|T|Qt|Qd)/', function ($m) use ($scaleUnits) { return $scaleUnits[$m[0]] ?? $m[0]; }, $currentPostfix);
        } else {
            // Ensure correct decimal separator for non-'fa' languages if it's not '.'
            if ($optionsDecimalSeparator !== '.') {
                // $formattedObject['value'] already handled by the check before 'fa' block
                $formattedObject['wholeNumber'] = str_replace('.', $optionsDecimalSeparator, $formattedObject['wholeNumber']);
            }
        }
        return $formattedObject;
    }

    // FIXED: Improved scientific notation conversion
    private function convertENotationToRegularNumber($eNotation, $originalInput)
    {
        // For simple cases like 1e3, directly format as a regular number
        if (is_int($eNotation) && $eNotation >= 1000) {
            return number_format($eNotation, 0, '.', '');
        }
        
        $parts = explode('e', strtolower((string)$originalInput));
        if (count($parts) !== 2) {
            return (string)$eNotation;
        }
        
        $coefficient = (float)$parts[0];
        $exponent = (int)$parts[1];
        
        // Handle negative exponents (very small numbers)
        if ($exponent < 0) {
            $absExponent = abs($exponent);
            // Determine precision needed to show all digits
            $precision = $absExponent;
            if (strpos($parts[0], '.') !== false) {
                $precision += strlen(explode('.', $parts[0])[1]);
            }
            // Use sprintf for more consistent behavior with trailing zeros for small numbers
            return sprintf('%.'.$precision.'f', (float)$eNotation);
        }
        
        // For positive exponents, format to show as a regular number
        // Preserve precision from coefficient for positive/zero exponent
        $coeffDecimalLen = 0;
        if (strpos($parts[0], '.') !== false) {
            $coeffDecimalParts = explode('.', $parts[0], 2);
            if (isset($coeffDecimalParts[1])) {
                $coeffDecimalLen = strlen($coeffDecimalParts[1]);
            }
        }
        // $eNotation is float, ensure formatting retains those decimals
        return number_format((float)$eNotation, $coeffDecimalLen, '.', '');
    }
}