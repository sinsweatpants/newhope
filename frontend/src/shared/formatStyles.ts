// getFormatStyles Function using CSS classes for indentation
export const getFormatStyles = (formatType: string, selectedFont = 'Amiri', selectedSize = '12pt'): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      fontFamily: `'${selectedFont}', ${formatType === 'sceneheading' ? 'sans-serif' : "'Courier New', monospace"}`,
      fontSize: selectedSize,
      direction: 'rtl',
      lineHeight: '1.5',
      minHeight: '1.2em',
      whiteSpace: 'pre-wrap', // Preserve whitespace for indentation
    };
    
    // These styles are now primarily controlled by dedicated CSS classes, 
    // but we can still apply dynamic styles like font here.
    const formatStyles: { [key: string]: React.CSSProperties } = {
      sceneheading: { fontWeight: 'bold', textTransform: 'uppercase', marginTop: '1rem' },
      character: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '1rem auto 0' },
      dialogue: { textAlign: 'center', margin: '0 auto 0.3rem' },
      parenthetical: { textAlign: 'center', fontStyle: 'italic', margin: '0 auto' },
      action: { margin: '1rem 0' },
      transition: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '1rem 0' },
      basmala: { textAlign: 'center', margin: '0 0 2rem 0', fontWeight: 'bold' },
    };
    
    return { ...baseStyles, ...formatStyles[formatType] };
};
