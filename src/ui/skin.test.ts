import { skinFor, type } from './skin';

describe('skinFor', () => {
  it('uses the dark surfaces and the light surfaces', () => {
    expect(skinFor('dark').background).toBe('#1D1E22');
    expect(skinFor('dark').listBackground).toBe('#232529');
    expect(skinFor('dark').surface).toBe('#303136');
    expect(skinFor('light').background).toBe('#FBFBFB');
    expect(skinFor('light').listBackground).toBe('#EFF3F2');
    expect(skinFor('light').surface).toBe('#FFFFFF');
  });
  it('keeps the brand green in both themes and the navy primary only in light', () => {
    expect(skinFor('dark').brand).toBe('#24C48E');
    expect(skinFor('light').brand).toBe('#24C48E');
    expect(skinFor('light').primary).toBe('#262957');
    expect(skinFor('dark').primary).toBe('#24C48E');
  });
  it('builds the text and stroke ramp from alpha steps', () => {
    expect(skinFor('light').text9).toBe('rgba(3,3,10,0.85)');
    expect(skinFor('dark').text9).toBe('rgba(255,255,255,0.85)');
    expect(skinFor('dark').stroke3).toBe('rgba(255,255,255,0.10)');
    expect(skinFor('light').stroke3).toBe('rgba(3,3,10,0.06)');
  });
});

describe('type', () => {
  it('matches the text appearances', () => {
    expect(type.headline1).toMatchObject({ fontSize: 20, lineHeight: 26, fontFamily: 'ui_bold' });
    expect(type.body3).toMatchObject({ fontSize: 12, lineHeight: 16, fontFamily: 'ui_regular' });
    expect(type.number).toMatchObject({ fontSize: 16, fontFamily: 'ui_number' });
  });
});
