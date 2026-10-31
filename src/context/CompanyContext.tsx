import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, FinancialYear } from '../types';
import { api } from '../services/api';

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  financialYears: FinancialYear[];
  activeFinancialYear: FinancialYear | null;
  setActiveFinancialYear: (fy: FinancialYear) => void;
  isLoading: boolean;
  refreshTenantData: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [activeFinancialYear, setActiveFinancialYearState] = useState<FinancialYear | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const compList = await api.getCompanies();
      setCompanies(compList);

      const savedCompanyId = localStorage.getItem('tallypilot_active_company_id');
      const foundComp = compList.find(c => String(c.id) === savedCompanyId) || compList[0] || null;
      setActiveCompanyState(foundComp);

      if (foundComp) {
        localStorage.setItem('tallypilot_active_company_id', String(foundComp.id));
        const fyList = await api.getFinancialYears();
        setFinancialYears(fyList);

        const savedFyId = localStorage.getItem('tallypilot_active_fy_id');
        const foundFy = fyList.find(f => String(f.id) === savedFyId) || fyList.find(f => f.is_current) || fyList[0] || null;
        setActiveFinancialYearState(foundFy);
        if (foundFy) {
          localStorage.setItem('tallypilot_active_fy_id', String(foundFy.id));
        }
      }
    } catch (err) {
      console.error('Failed to load company/FY context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setActiveCompany = async (company: Company) => {
    setActiveCompanyState(company);
    localStorage.setItem('tallypilot_active_company_id', String(company.id));
    try {
      const fyList = await api.getFinancialYears();
      setFinancialYears(fyList);
      const currentFy = fyList.find(f => f.is_current) || fyList[0] || null;
      setActiveFinancialYearState(currentFy);
      if (currentFy) {
        localStorage.setItem('tallypilot_active_fy_id', String(currentFy.id));
      }
    } catch (e) {
      console.error('Error switching company:', e);
    }
  };

  const setActiveFinancialYear = (fy: FinancialYear) => {
    setActiveFinancialYearState(fy);
    localStorage.setItem('tallypilot_active_fy_id', String(fy.id));
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        setActiveCompany,
        financialYears,
        activeFinancialYear,
        setActiveFinancialYear,
        isLoading,
        refreshTenantData: loadData
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

