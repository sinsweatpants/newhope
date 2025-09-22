// getFormatStyles Function
export const getFormatStyles = (formatType: string, selectedFont = 'Amiri', selectedSize = '12pt'): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      fontFamily: `'${selectedFont}', monospace`,
      fontSize: selectedSize,
      direction: 'rtl',
      lineHeight: '1.5',
      minHeight: '1.2em'
    };
    
    const formatStyles: { [key: string]: React.CSSProperties } = {
      basmala: { textAlign: 'left', margin: '0 0 2rem 0', fontWeight: 'bold' },
      'scene-header-top-line': { display: 'flex', justifyContent: 'space-between', width: '100%', margin: '0rem 0 0 0' },
      'scene-header-3': { textAlign: 'center', fontWeight: 'bold', margin: '0' },
      action: { textAlign: 'right', margin: '0rem 0' },
      'stage-direction': { textAlign: 'right', margin: '0.3rem 0', fontStyle: 'italic', color: '#666' },
      character: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '0rem auto 0 auto', width: '2.5in' },
      parenthetical: { textAlign: 'center', fontStyle: 'italic', margin: '0 auto', width: '2.0in' },
      dialogue: { textAlign: 'center', margin: '0 auto 0.3rem auto', width: '2.5in', lineHeight: '1.2' },
      transition: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '0rem 0' },
      'cut-transition': { textAlign: 'center', fontWeight: 'bold', margin: '1rem 0', fontSize: '14pt' },
      'syriac-dialogue-container': { margin: '0.5rem 0', textAlign: 'center' },
      'syriac-text': { fontFamily: 'Estrangelo Edessa, serif', fontSize: '14pt', margin: '0.2rem 0', direction: 'ltr' },
      'arabic-translation': { fontSize: '11pt', fontStyle: 'italic', color: '#555', margin: '0.2rem 0' }
    };
    
    const finalStyles = { ...baseStyles, ...formatStyles[formatType] };
    
    if (formatType === 'scene-header-1') return { ...baseStyles, fontWeight: 'bold', textTransform: 'uppercase' };
    if (formatType === 'scene-header-2') return { ...baseStyles, fontStyle: 'italic' };
    
    return finalStyles;
};
