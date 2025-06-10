import NumberFormatter from '../../src/format'; // Path from ts/test/format/ to ts/src/format/index.ts

describe('NumberFormatter Low Precision Fix', () => {
  // Test cases for English locale
  describe('English Locale (en)', () => {
    const formatter = new NumberFormatter({ precision: 'low', language: 'en' });

    it('should correctly format very small numbers (0 <= number < 0.01) after fix', () => {
      // This range now uses: p=4, d=2, r=true, f=2
      expect(formatter.toString(0.001)).toBe('0.00'); // f=2 takes precedence
      expect(formatter.toString(0.0001)).toBe('0.00'); // f=2 takes precedence
      expect(formatter.toString(0.00001)).toBe('0.00'); // f=2 takes precedence
      expect(formatter.toString(0.005)).toBe('0.01'); // rounds up to 0.01 due to d=2, then f=2 applies
      expect(formatter.toString(0.0099)).toBe('0.01'); // rounds up to 0.01 due to d=2, then f=2 applies
    });

    it('should format zero correctly with fixed decimal places for (0 <= number < 0.01) range', () => {
      // With f=2 for this range, 0 should be "0.00"
      expect(formatter.toString(0)).toBe('0.00');
    });

    it('should correctly format numbers where 0.01 <= number < 0.1 (existing behavior)', () => {
      // This range uses: p=2, d=1, r=true. (f is not set, so 0)
      expect(formatter.toString(0.01)).toBe('0.01');
      expect(formatter.toString(0.04)).toBe('0.04');
      expect(formatter.toString(0.05)).toBe('0.1');
      expect(formatter.toString(0.09)).toBe('0.1');
    });

    it('should correctly format numbers where 0.1 <= number < 1 (existing behavior)', () => {
      // This range uses: p=2, d=2, r=true. (f is not set, so 0)
      expect(formatter.toString(0.1)).toBe('0.1');
      expect(formatter.toString(0.12)).toBe('0.12');
      expect(formatter.toString(0.123)).toBe('0.12'); // p=2, d=2, r=true
      expect(formatter.toString(0.99)).toBe('0.99');
      expect(formatter.toString(0.999)).toBe('1.00'); // p=2, d=2, r=true
    });
  });

  // Test cases for Persian locale
  describe('Persian Locale (fa)', () => {
    const formatter = new NumberFormatter({ precision: 'low', language: 'fa' });

    it('should correctly format very small numbers (0 <= number < 0.01) after fix', () => {
      // Corrected Farsi separators: decimal is ٫
      expect(formatter.toString(0.001)).toBe('۰٫۰۰'); // f=2 takes precedence
      expect(formatter.toString(0.0001)).toBe('۰٫۰۰'); // f=2 takes precedence
      expect(formatter.toString(0.00001)).toBe('۰٫۰۰'); // f=2 takes precedence
    });

    it('should format zero correctly with fixed decimal places in fa for (0 <= number < 0.01) range', () => {
      expect(formatter.toString(0)).toBe('۰٫۰۰'); // Corrected Farsi separators
    });

    it('should correctly format numbers where 0.01 <= number < 0.1 in fa', () => {
      expect(formatter.toString(0.01)).toBe('۰٫۰۱'); // Corrected Farsi separators
      expect(formatter.toString(0.05)).toBe('۰٫۱');  // Corrected Farsi separators
    });
  });
});

// CSV Data Formatting Tests
const csvData = [
  ["Input","Low Precision","Medium Precision","High Precision","Currency Template Auto","Percent Template Auto","Low Precision (FA)","Medium Precision (FA)","High Precision (FA)","Currency Template Auto (FA)","Percent Template Auto (FA)"],
  ["-17.5645","-17.6","-17.56","-17.5645","-$17.5645","-17.56%","-۱۷٫۶","-۱۷٫۵۶","-۱۷٫۵۶۴۵","-۱۷٫۵۶۴۵ ت","-۱۷٫۵۶٪"],
  ["-1","-1.00","-1","-1","-$1.0000","-1.00%","-۱٫۰۰","-۱","-۱","-۱٫۰۰۰۰ ت","-۱٫۰۰٪"],
  ["0","0.00","0","0","$0.0000","0.00%","۰٫۰۰","۰","۰","۰٫۰۰۰۰ ت","۰٫۰۰٪"],
  ["0.0000000000000000000000000000002029697","0.00","0.0₂₉203","0.000000000000000000000000000000202970","$0.0₂₉203","0.00%","۰٫۰۰","۰٫۰₂₉۲۰۳","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۲۰۲۹۷۰","۰٫۰₂₉۲۰۳ ت","۰٫۰۰٪"],
  ["0.000000000000000000000000000009702878","0.00","0.0₂₉9703","0.00000000000000000000000000000970288","$0.0₂₉9703","0.00%","۰٫۰۰","۰٫۰₂₉۹۷۰۳","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۹۷۰۲۸۸","۰٫۰₂₉۹۷۰۳ ت","۰٫۰۰٪"],
  ["0.00000000000000000000000000004486327","0.00","0.0₂₈4486","0.0000000000000000000000000000448633","$0.0₂₈4486","0.00%","۰٫۰۰","۰٫۰₂₈۴۴۸۶","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۴۴۸۶۳۳","۰٫۰₂₈۴۴۸۶ ت","۰٫۰۰٪"],
  ["0.0000000000000000000000000005029548","0.00","0.0₂₇503","0.000000000000000000000000000502955","$0.0₂₇503","0.00%","۰٫۰۰","۰٫۰₂₇۵۰۳","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۵۰۲۹۵۵","۰٫۰₂₇۵۰۳ ت","۰٫۰۰٪"],
  ["0.000000000000000000000000009921464","0.00","0.0₂₆9921","0.00000000000000000000000000992146","$0.0₂₆9921","0.00%","۰٫۰۰","۰٫۰₂₆۹۹۲۱","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۹۹۲۱۴۶","۰٫۰₂₆۹۹۲۱ ت","۰٫۰۰٪"],
  ["0.00000000000000000000000007097074","0.00","0.0₂₅7097","0.0000000000000000000000000709707","$0.0₂₅7097","0.00%","۰٫۰۰","۰٫۰₂₅۷۰۹۷","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۷۰۹۷۰۷","۰٫۰₂₅۷۰۹۷ ت","۰٫۰۰٪"],
  ["0.0000000000000000000000007529910","0.00","0.0₂₄753","0.000000000000000000000000752991","$0.0₂₄753","0.00%","۰٫۰۰","۰٫۰₂₄۷۵۳","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۷۵۲۹۹۱","۰٫۰₂₄۷۵۳ ت","۰٫۰۰٪"],
  ["0.000000000000000000000002371164","0.00","0.0₂₃2371","0.00000000000000000000000237116","$0.0₂₃2371","0.00%","۰٫۰۰","۰٫۰₂₃۲۳۷۱","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۲۳۷۱۱۶","۰٫۰₂₃۲۳۷۱ ت","۰٫۰۰٪"],
  ["0.00000000000000000000001115743","0.00","0.0₂₂1116","0.0000000000000000000000111574","$0.0₂₂1116","0.00%","۰٫۰۰","۰٫۰₂₂۱۱۱۶","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۱۱۱۵۷۴","۰٫۰₂₂۱۱۱۶ ت","۰٫۰۰٪"],
  ["0.0000000000000000000008267237","0.00","0.0₂₁8267","0.000000000000000000000826724","$0.0₂₁8267","0.00%","۰٫۰۰","۰٫۰₂₁۸۲۶۷","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۸۲۶۷۲۴","۰٫۰₂₁۸۲۶۷ ت","۰٫۰۰٪"],
  ["0.000000000000000000007026645","0.00","0.0₂₀7027","0.00000000000000000000702665","$0.0₂₀7027","0.00%","۰٫۰۰","۰٫۰₂₀۷۰۲۷","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۷۰۲۶۶۵","۰٫۰₂₀۷۰۲۷ ت","۰٫۰۰٪"],
  ["0.00000000000000000001718273","0.00","0.0₁₉1718","0.0000000000000000000171827","$0.0₁₉1718","0.00%","۰٫۰۰","۰٫۰₁₉۱۷۱۸","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۱۷۱۸۲۷","۰٫۰₁₉۱۷۱۸ ت","۰٫۰۰٪"],
  ["0.0000000000000000002760080","0.00","0.0₁₈276","0.000000000000000000276008","$0.0₁₈276","0.00%","۰٫۰۰","۰٫۰₁₈۲۷۶","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۲۷۶۰۰۸","۰٫۰₁₈۲۷۶ ت","۰٫۰۰٪"],
  ["0.00000000000000000400863","0.00","0.0₁₇4009","0.00000000000000000400863","$0.0₁₇4009","0.00%","۰٫۰۰","۰٫۰₁₇۴۰۰۹","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۴۰۰۸۶۳","۰٫۰₁₇۴۰۰۹ ت","۰٫۰۰٪"],
  ["0.00000000000000009381725","0.00","0.0₁₆9382","0.0000000000000000938173","$0.0₁₆9382","0.00%","۰٫۰۰","۰٫۰₁₆۹۳۸۲","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۹۳۸۱۷۳","۰٫۰₁₆۹۳۸۲ ت","۰٫۰۰٪"],
  ["0.000000000000000796739","0.00","0.0₁₅7967","0.000000000000000796739","$0.0₁₅7967","0.00%","۰٫۰۰","۰٫۰₁₅۷۹۶۷","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۷۹۶۷۳۹","۰٫۰₁₅۷۹۶۷ ت","۰٫۰۰٪"],
  ["0.000000000000005148759","0.00","0.0₁₄5149","0.00000000000000514876","$0.0₁₄5149","0.00%","۰٫۰۰","۰٫۰₁₄۵۱۴۹","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۰۵۱۴۸۷۶","۰٫۰₁₄۵۱۴۹ ت","۰٫۰۰٪"],
  ["0.00000000000009393057","0.00","0.0₁₃9393","0.0000000000000939306","$0.0₁₃9393","0.00%","۰٫۰۰","۰٫۰₁₃۹۳۹۳","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۰۹۳۹۳۰۶","۰٫۰₁₃۹۳۹۳ ت","۰٫۰۰٪"],
  ["0.0000000000003641147","0.00","0.0₁₂3641","0.000000000000364115","$0.0₁₂3641","0.00%","۰٫۰۰","۰٫۰₁₂۳۶۴۱","۰٫۰۰۰۰۰۰۰۰۰۰۰۰۳۶۴۱۱۵","۰٫۰₁₂۳۶۴۱ ت","۰٫۰۰٪"],
  ["0.000000000004887458","0.00","0.0₁₁4887","0.00000000000488746","$0.0₁₁4887","0.00%","۰٫۰۰","۰٫۰₁₁۴۸۸۷","۰٫۰۰۰۰۰۰۰۰۰۰۰۴۸۸۷۴۶","۰٫۰₁₁۴۸۸۷ ت","۰٫۰۰٪"],
  ["0.00000000004274875","0.00","0.0₁₀4275","0.0000000000427488","$0.0₁₀4275","0.00%","۰٫۰۰","۰٫۰₁₀۴۲۷۵","۰٫۰۰۰۰۰۰۰۰۰۰۴۲۷۴۸۸","۰٫۰₁₀۴۲۷۵ ت","۰٫۰۰٪"],
  ["0.000000000468289","0.00","0.0₉4683","0.000000000468289","$0.0₉4683","0.00%","۰٫۰۰","۰٫۰₉۴۶۸۳","۰٫۰۰۰۰۰۰۰۰۰۴۶۸۲۸۹","۰٫۰₉۴۶۸۳ ت","۰٫۰۰٪"],
  ["0.000000002835371","0.00","0.0₈2835","0.00000000283537","$0.0₈2835","0.00%","۰٫۰۰","۰٫۰₈۲۸۳۵","۰٫۰۰۰۰۰۰۰۰۲۸۳۵۳۷","۰٫۰₈۲۸۳۵ ت","۰٫۰۰٪"],
  ["0.00000007072879","0.00","0.0₇7073","0.0000000707288","$0.0₇7073","0.00%","۰٫۰۰","۰٫۰₇۷۰۷۳","۰٫۰۰۰۰۰۰۰۷۰۷۲۸۸","۰٫۰₇۷۰۷۳ ت","۰٫۰۰٪"],
  ["0.0000003191564","0.00","0.0₆3192","0.000000319156","$0.0₆3192","0.00%","۰٫۰۰","۰٫۰₆۳۱۹۲","۰٫۰۰۰۰۰۰۳۱۹۱۵۶","۰٫۰₆۳۱۹۲ ت","۰٫۰۰٪"],
  ["0.000005254828","0.00","0.0₅5255","0.00000525483","$0.0₅5255","0.00%","۰٫۰۰","۰٫۰₅۵۲۵۵","۰٫۰۰۰۰۰۵۲۵۴۸۳","۰٫۰₅۵۲۵۵ ت","۰٫۰۰٪"],
  ["0.00001726923","0.00","0.0₄1727","0.0000172692","$0.0₄1727","0.00%","۰٫۰۰","۰٫۰₄۱۷۲۷","۰٫۰۰۰۰۱۷۲۶۹۲","۰٫۰₄۱۷۲۷ ت","۰٫۰۰٪"],
  ["0.0004963835","0.0005","0.0004964","0.000496384","$0.0004964","0.05%","۰٫۰۰۰۵","۰٫۰۰۰۴۹۶۴","۰٫۰۰۰۴۹۶۳۸۴","۰٫۰۰۰۴۹۶۴ ت","۰٫۰۵٪"],
  ["0.003380235","0.003","0.00338","0.00338024","$0.0033802","0.00%","۰٫۰۰۳","۰٫۰۰۳۳۸","۰٫۰۰۳۳۸۰۲۴","۰٫۰۰۳۳۸۰۲ ت","۰٫۰۰٪"],
  ["0.07488684","0.07","0.07489","0.0748868","$0.0748868","0.07%","۰٫۰۷","۰٫۰۷۴۸۹","۰٫۰۷۴۸۸۶۸","۰٫۰۷۴۸۸۶۸ ت","۰٫۰۷٪"],
  ["0.2184156","0.22","0.2184","0.218416","$0.218416","0.22%","۰٫۲۲","۰٫۲۱۸۴","۰٫۲۱۸۴۱۶","۰٫۲۱۸۴۱۶ ت","۰٫۲۲٪"],
  ["1","1.00","1","1","$1.0000","1.00%","۱٫۰۰","۱","۱","۱٫۰۰۰۰ ت","۱٫۰۰٪"],
  ["9.1513056","9.15","9.151","9.1513","$9.1513","9.15%","۹٫۱۵","۹٫۱۵۱","۹٫۱۵۱۳","۹٫۱۵۱۳ ت","۹٫۱۵٪"],
  ["67.4416444","67.4","67.44","67.4416","$67.4416","67.44%","۶۷٫۴","۶۷٫۴۴","۶۷٫۴۴۱۶","۶۷٫۴۴۱۶ ت","۶۷٫۴۴٪"],
  ["722.6124104","723","722.6","722.612","$722.612","722.61%","۷۲۳","۷۲۲٫۶","۷۲۲٫۶۱۲","۷۲۲٫۶۱۲ ت","۷۲۲٫۶۱٪"],
  ["7352.5266845","7.4K","7.353K","7,352.52668","$7.3525K", "7352.53%","۷٫۴ هزار","۷٫۳۵۳ هزار","۷٬۳۵۲٫۵۲۶۶۸","۷٫۳۵۲۵ هزار ت","۷۳۵۲٫۵۳٪"],
  ["21049.2748923","21K","21.05K","21,049.27489","$21.049K", "21049.27%","۲۱ هزار","۲۱٫۰۵ هزار","۲۱٬۰۴۹٫۲۷۴۸۹","۲۱٫۰۴۹ هزار ت","۲۱۰۴۹٫۲۷٪"],
  ["446175.9921491","446K","446.18K","446,175.99215","$446.18K", "446175.99%","۴۴۶ هزار","۴۴۶٫۱۸ هزار","۴۴۶٬۱۷۵٫۹۹۲۱۵","۴۴۶٫۱۸ هزار ت","۴۴۶۱۷۵٫۹۹٪"],
  ["5605394.1250563","5.6M","5.605M","5,605,394.12506","$5.6054M", "5605394.13%","۵٫۶ میلیون","۵٫۶۰۵ میلیون","۵٬۶۰۵٬۳۹۴٫۱۲۵۰۶","۵٫۶۰۵۴ میلیون ت","۵۶۰۵۳۹۴٫۱۳٪"],
  ["13845218.5393351","14M","13.845M","13,845,218.53934","$13.845M", "13845218.54%","۱۴ میلیون","۱۳٫۸۴۵ میلیون","۱۳٬۸۴۵٬۲۱۸٫۵۳۹۳۴","۱۳٫۸۴۵ میلیون ت","۱۳۸۴۵۲۱۸٫۵۴٪"],
  ["225623973.90165761","226M","225.624M","225,623,973.90166","$225.62M", "225623973.90%","۲۲۶ میلیون","۲۲۵٫۶۲۴ میلیون","۲۲۵٬۶۲۳٬۹۷۳٫۹۰۱۶۶","۲۲۵٫۶۲ میلیون ت","۲۲۵۶۲۳۹۷۳٫۹۰٪"],
  ["3431900815.84156441","3.4B","3.432B","3,431,900,815.84156","$3.4319B", "3431900815.84%","۳٫۴ میلیارد","۳٫۴۳۲ میلیارد","۳٬۴۳۱٬۹۰۰٬۸۱۵٫۸۴۱۵۶","۳٫۴۳۱۹ میلیارد ت","۳۴۳۱٬۹۰۰٬۸۱۵٫۸۴٪"],
  ["24784271648.66592451","25B","24.784B","24,784,271,648.66592","$24.784B", "24784271648.67%","۲۵ میلیارد","۲۴٫۷۸۴ میلیارد","۲۴٬۷۸۴٬۲۷۱٬۶۴۸٫۶۶۵۹۲","۲۴٫۷۸۴ میلیارد ت","۲۴٬۷۸۴٬۲۷۱٬۶۴۸٫۶۷٪"],
  ["753857278706.5123386","754B","753.857B","753,857,278,706.51234","$753.86B", "753857278706.51%","۷۵۴ میلیارد","۷۵۳٫۸۵۷ میلیارد","۷۵۳٬۸۵۷٬۲۷۸٬۷۰۶٫۵۱۲۳۴","۷۵۳٫۸۶ میلیارد ت","۷۵۳٬۸۵۷٬۲۷۸٬۷۰۶٫۵۱٪"],
  ["5242533596506.961550711","5.2T","5.243T","5,242,533,596,506.96191","$5.2425T", "5242533596506.96%","۵٫۲ تریلیون","۵٫۲۴۳ تریلیون","۵٬۲۴۲٬۵۳۳٬۵۹۶٬۵۰۶٫۹۶۱۹۱","۵٫۲۴۲۵ همت","۵٬۲۴۲٬۵۳۳٬۵۹۶٬۵۰۶٫۹۶٪"],
  ["66184153402826.56183641","66T","66.184T","66,184,153,402,826.56250","$66.184T", "66184153402826.56%","۶۶ تریلیون","۶۶٫۱۸۴ تریلیون","۶۶٬۱۸۴٬۱۵۳٬۴۰۲٬۸۲۶٫۵۶۲۵۰","۶۶٫۱۸۴ همت","۶۶٬۱۸۴٬۱۵۳٬۴۰۲٬۸۲۶٫۵۶٪"],
  ["461177125702594.37900361","461T","461.177T","461,177,125,702,594.37500","$461.18T", "461177125702594.38%","۴۶۱ تریلیون","۴۶۱٫۱۷۷ تریلیون","۴۶۱٬۱۷۷٬۱۲۵٬۷۰۲٬۵۹۴٫۳۷۵۰۰","۴۶۱٫۱۸ همت","۴۶۱٬۱۷۷٬۱۲۵٬۷۰۲٬۵۹۴٫۳۸٪"],
  ["8274168694974230.7277401","8.3Qd","8.274Qd","8,274,168,694,974,230.00000","$8.2742Qd", "8274168694974231.00%","۸٫۳ کادریلیون","۸٫۲۷۴ کادریلیون","۸٬۲۷۴٬۱۶۸٬۶۹۴٬۹۷۴٬۲۳۰٫۰۰۰۰۰","۸٫۲۷۴۲ هزار همت","۸٬۲۷۴٬۱۶۸٬۶۹۴٬۹۷۴٬۲۳۱٫۰۰٪"],
  ["79981416426328600.19047181","80Qd","79.981Qd","79,981,416,426,328,600.00000","$79.981Qd", "79981416426328600.00%","۸۰ کادریلیون","۷۹٫۹۸۱ کادریلیون","۷۹٬۹۸۱٬۴۱۶٬۴۲۶٬۳۲۸٬۶۰۰٫۰۰۰۰۰","۷۹٫۹۸۱ هزار همت","۷۹٬۹۸۱٬۴۱۶٬۴۲۶٬۳۲۸٬۶۰۰٫۰۰٪"],
  ["281113426986779000.34882261","281Qd","281.113Qd","281,113,426,986,779,000.00000","$281.11Qd", "281113426986779000.00%","۲۸۱ کادریلیون","۲۸۱٫۱۱۳ کادریلیون","۲۸۱٬۱۱۳٬۴۲۶٬۹۸۶٬۷۷۹٬۰۰۰٫۰۰۰۰۰","۲۸۱٫۱۱ هزار همت","۲۸۱٬۱۱۳٬۴۲۶٬۹۸۶٬۷۷۹٬۰۰۰٫۰۰٪"],
  ["1403619296108230000.31771111","1.4Qt","1.404Qt","1,403,619,296,108,230,000.00000","$1.4036Qt", "1403619296108230000.00%","۱٫۴ کنتیلیون","۱٫۴۰۴ کنتیلیون","۱٬۴۰۳٬۶۱۹٬۲۹۶٬۱۰۸٬۲۳۰٬۰۰۰٫۰۰۰۰۰","۱٫۴۰۳۶ میلیون همت","۱٬۴۰۳٬۶۱۹٬۲۹۶٬۱۰۸٬۲۳۰٬۰۰۰٫۰۰٪"],
  ["81027928521274800000.95774121","81Qt","81.028Qt","81,027,928,521,274,800,000.00000","$81.028Qt", "81027928521274800000.00%","۸۱ کنتیلیون","۸۱٫۰۲۸ کنتیلیون","۸۱٬۰۲۷٬۹۲۸٬۵۲۱٬۲۷۴٬۸۰۰٬۰۰۰٫۰۰۰۰۰","۸۱٫۰۲۸ میلیون همت","۸۱٬۰۲۷٬۹۲۸٬۵۲۱٬۲۷۴٬۸۰۰٬۰۰۰٫۰۰٪"],
  ["477752572587506000000.18513861","478Qt","477.753Qt","477,752,572,587,506,000,000.00000","$477.75T", "477752572587506000000.00%","۴۷۸ کنتیلیون","۴۷۷٫۷۵۳ کنتیلیون","۴۷۷٬۷۵۲٬۵۷۲٬۵۸۷٬۵۰۶٬۰۰۰٬۰۰۰٫۰۰۰۰۰","۴۷۷٫۷۵ همت","۴۷۷٬۷۵۲٬۵۷۲٬۵۸۷٬۵۰۶٬۰۰۰٬۰۰۰٫۰۰٪"],
  ["overflow","0","0","0","$0.0000","0%","۰","۰","۰","۰٫۰۰۰۰ ت","۰٪"]
];

const columnConfigs = [
  { name: "Low Precision", options: { precision: 'low', language: 'en', template: 'number' } },
  { name: "Medium Precision", options: { precision: 'medium', language: 'en', template: 'number' } },
  { name: "High Precision", options: { precision: 'high', language: 'en', template: 'number' } },
  { name: "Currency Template Auto", options: { template: 'usd', precision: 'auto', language: 'en' } },
  { name: "Percent Template Auto", options: { template: 'percent', precision: 'auto', language: 'en' } },
  { name: "Low Precision (FA)", options: { precision: 'low', language: 'fa', template: 'number' } },
  { name: "Medium Precision (FA)", options: { precision: 'medium', language: 'fa', template: 'number' } },
  { name: "High Precision (FA)", options: { precision: 'high', language: 'fa', template: 'number' } },
  { name: "Currency Template Auto (FA)", options: { template: 'irt', precision: 'auto', language: 'fa' } },
  { name: "Percent Template Auto (FA)", options: { template: 'percent', precision: 'auto', language: 'fa' } }
];

describe('CSV Data Formatting Tests', () => {
  // Skip header row by starting loop from 1
  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    const input = row[0];

    // Handling for the "overflow" input string
    const currentInput = (input === "overflow") ? Number.MAX_SAFE_INTEGER.toString() + "0000" : input; // Simulate overflow
    const inputDescription = (input === "overflow") ? `Overflow Input (simulated as ${currentInput})` : `Input: ${input}`;

    describe(inputDescription, () => {
      columnConfigs.forEach((config, index) => {
        const expectedOutput = row[index + 1];
        // Ensure that an expected output exists for the current configuration.
        if (expectedOutput !== undefined && expectedOutput !== null) {
          it(`should format for ${config.name}`, () => {
            const formatter = new NumberFormatter(config.options);
            expect(formatter.toPlainString(currentInput)).toBe(expectedOutput);
          });
        }
      });
    });
  }
});

describe('Incremental Input Scenarios', () => {
  describe('Very Small Decimal Number (High Precision)', () => {
    const formatter = new NumberFormatter({ precision: 'high', language: 'en' });
    it('should correctly format incremental input for very small decimals', () => {
      expect(formatter.toString('0')).toBe('0');
      expect(formatter.toString('0.')).toBe('0.');
      expect(formatter.toString('0.0')).toBe('0.0');
      expect(formatter.toString('0.00000003')).toBe('0.00000003');
      expect(formatter.toString('0.000000030')).toBe('0.000000030');
      expect(formatter.toString('0.00000003021')).toBe('0.00000003021');
    });
  });

  describe('E-commerce Price (USD Template)', () => {
    const usdFormatter = new NumberFormatter({ language: 'en', template: 'usd', precision: 'high' }); // Assuming high precision for price input
    it('should correctly format incremental input for USD prices', () => {
      expect(usdFormatter.toString('1')).toBe('$1');
      expect(usdFormatter.toString('19')).toBe('$19');
      expect(usdFormatter.toString('19.')).toBe('$19.');
      expect(usdFormatter.toString('19.9')).toBe('$19.9');
      expect(usdFormatter.toString('19.99')).toBe('$19.99');
    });
  });

  describe('Percentage Value (Percent Template)', () => {
    // Note: The original issue implies specific behavior for percent,
    // where "0" or "0." might auto-format to "0.00%".
    // This depends on how fixedDecimalZeros interacts with the new logic for this template.
    const percentFormatter = new NumberFormatter({ language: 'en', template: 'percent', precision: 'low' }); // Typically percent uses 'low'

    it('should format initial percentage inputs as per typical percent template behavior', () => {
      // Precision 'low' for template 'percent' has f=2 for numbers < 10 (e.g. 0-0.01 range has f=2)
      // If originalInput is "0" (number) or "0" (string without decimal), fixedDecimalZeros applies.
      expect(percentFormatter.toString(0)).toBe('0.00%');
      expect(percentFormatter.toString('0')).toBe('0.00%');

      // If originalInput is "0.", the new logic should preserve the decimal.
      // However, the percent template might have specific post-processing or fixedDecimalZeros
      // that still result in "0.00%". The issue description's "0." => "0.00%" implies this.
      // Based on the implemented changes, "0." would be "0.%" if not for fixedDecimalZeros.
      // Let's test the expectation from the issue.
      // The 'low' precision for 'percent' in the range 0 to 0.01 has f=2.
      // The code: `if (fixedDecimalZeros > 0 && fractionalPartStr.length === 0)` will make it "0.00"
      // Then "%" is added.
      expect(percentFormatter.toString('0.')).toBe('0.00%');
    });

    it('should correctly format incremental percentage inputs', () => {
      // For "0.2", fractionalPart is "2". fixedDecimalZeros might not apply or might be overridden.
      // The issue states "0.2" => "0.2%".
      // With precision 'low', 0.1 to 1 range has p=2, d=2, r=true, f=0.
      // So, "0.2" should be "0.2%".
      expect(percentFormatter.toString('0.2')).toBe('0.2%');
      expect(percentFormatter.toString('0.25')).toBe('0.25%');
      // What about "0.257"? Low precision for 0.1-1 is (p=2, d=2, r=true) -> "0.26%"
      expect(percentFormatter.toString('0.257')).toBe('0.26%');
    });
  });

  describe('Banking Amount (High Precision)', () => {
    const highPrecisionFormatter = new NumberFormatter({ language: 'en', precision: 'high' });
    it('should correctly format incremental input for banking amounts with thousand separators', () => {
      expect(highPrecisionFormatter.toString('5')).toBe('5');
      expect(highPrecisionFormatter.toString('50000')).toBe('50,000');
      expect(highPrecisionFormatter.toString('50000.')).toBe('50,000.');
      expect(highPrecisionFormatter.toString('50000.5')).toBe('50,000.5'); // Not "50,001"
      expect(highPrecisionFormatter.toString('50000.50')).toBe('50,000.50');
    });
  });

  describe('Thousand Separator Test (High Precision)', () => {
    const highPrecisionFormatter = new NumberFormatter({ language: 'en', precision: 'high' });
    it('should correctly apply thousand separators during incremental input', () => {
      expect(highPrecisionFormatter.toString('1')).toBe('1');
      expect(highPrecisionFormatter.toString('10')).toBe('10');
      expect(highPrecisionFormatter.toString('100')).toBe('100');
      expect(highPrecisionFormatter.toString('1000')).toBe('1,000');
      expect(highPrecisionFormatter.toString('10000')).toBe('10,000');
      expect(highPrecisionFormatter.toString('100002')).toBe('100,002');
      expect(highPrecisionFormatter.toString('1000023')).toBe('1,000,023');
      expect(highPrecisionFormatter.toString('1000023.')).toBe('1,000,023.');
      expect(highPrecisionFormatter.toString('1000023.4')).toBe('1,000,023.4');
      expect(highPrecisionFormatter.toString('1000023.45')).toBe('1,000,023.45');
    });
  });

  describe('Edge Case: Inputting Just a Decimal Separator', () => {
    const formatter = new NumberFormatter({ precision: 'high', language: 'en' });
    it('should handle input of just "."', () => {
      // Current logic might make this "0." if nonFractionalStr is empty and becomes "0"
      // The originalInput.includes('.') will be true. originalDecimalPart will be empty.
      // wholeNumberStr = `0${decimalSeparator}${''}` which is "0."
      expect(formatter.toString('.')).toBe('0.');
    });
    it('should handle input of just "-."', () => {
      // Similar to above, but with a sign
      expect(formatter.toString('-.')).toBe('-0.');
    });
  });

  describe('Persian Locale Incremental Input', () => {
    const faFormatter = new NumberFormatter({ language: 'fa', precision: 'high' });
    it('should correctly format incremental Persian numbers with correct separators', () => {
      expect(faFormatter.toString('1')).toBe('۱');
      expect(faFormatter.toString('1234')).toBe('۱٬۲۳۴'); // Thousand separator is correct
      expect(faFormatter.toString('1234.')).toBe('۱٬۲۳۴٫'); // Decimal separator is correct
      expect(faFormatter.toString('1234.5')).toBe('۱٬۲۳۴٫۵'); // Decimal separator is correct
      expect(faFormatter.toString('1234.56')).toBe('۱٬۲۳۴٫۵۶'); // Decimal separator is correct
      expect(faFormatter.toString('0.')).toBe('۰٫'); // Decimal separator is correct
      expect(faFormatter.toString('.5')).toBe('۰٫۵'); // Decimal separator is correct
    });

    const faPercentFormatter = new NumberFormatter({ language: 'fa', template: 'percent', precision: 'low' });
    it('should correctly format incremental Persian percentages', () => {
      expect(faPercentFormatter.toString('0')).toBe('۰٫۰۰٪'); // Decimal separator is correct
      expect(faPercentFormatter.toString('0.')).toBe('۰٫۰۰٪'); // Decimal separator is correct
      expect(faPercentFormatter.toString('0.2')).toBe('۰٫۲٪');  // Decimal separator is correct
      expect(faPercentFormatter.toString('0.25')).toBe('۰٫۲۵٪'); // Decimal separator is correct
    });
  });
});
