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
      basmala: { textAlign: 'center', margin: '0 auto', display: 'block', width: '100%' },
      'scene-header-top-line': { display: 'flex', justifyContent: 'space-between', width: '100%', margin: '1rem 0 0 0' },
      'scene-header-3': { textAlign: 'center', fontWeight: 'bold', margin: '0' },
      action: { textAlign: 'right', margin: '1rem 0' },
      character: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '1rem auto 0 auto', width: '3.5in' },
      parenthetical: { textAlign: 'center', fontStyle: 'italic', margin: '0 auto', width: '3in' },
      dialogue: { textAlign: 'center', margin: '0 auto 0.3rem auto', width: '3.5in', lineHeight: '1.2' },
      transition: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '1rem 0' }
    };
    
    const finalStyles = { ...baseStyles, ...formatStyles[formatType] };
    
    if (formatType === 'scene-header-1') return { fontWeight: 'bold', textTransform: 'uppercase' };
    if (formatType === 'scene-header-2') return { fontStyle: 'italic' };
    
    return finalStyles;
};