import React, { createContext, useContext, useState } from 'react';

interface MoneyPrivacyContextType {
  isMoneyHidden: boolean;
  toggleHideMoney: () => void;
  mask: (formattedValue: string) => string;
}

const MoneyPrivacyContext = createContext<MoneyPrivacyContextType>({
  isMoneyHidden: false,
  toggleHideMoney: () => {},
  mask: (v) => v,
});

export const MoneyPrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMoneyHidden, setIsMoneyHidden] = useState<boolean>(false);

  const toggleHideMoney = () => {
    setIsMoneyHidden((prev) => !prev);
  };

  const mask = (formattedValue: string): string => {
    if (!isMoneyHidden) return formattedValue;
    if (!formattedValue) return '••••••';

    // Retain sign and currency prefix
    const isNegative = formattedValue.trim().startsWith('-');
    const isPositive = formattedValue.trim().startsWith('+');
    const sign = isNegative ? '-' : isPositive ? '+' : '';

    if (formattedValue.includes('₹')) {
      return `${sign}₹ ••••••`;
    }
    if (formattedValue.includes('SAR')) {
      return `${sign}SAR ••••••`;
    }
    if (formattedValue.includes('%')) {
      return `•••%`;
    }
    return `${sign}••••••`;
  };

  return (
    <MoneyPrivacyContext.Provider value={{ isMoneyHidden, toggleHideMoney, mask }}>
      {children}
    </MoneyPrivacyContext.Provider>
  );
};

export const useMoneyPrivacy = () => useContext(MoneyPrivacyContext);
