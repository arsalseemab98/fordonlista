import { Header } from '@/components/layout/header'
import { ImportWizard } from '@/components/import/import-wizard'
import { DataImportTracker } from '@/components/import/data-import-tracker'
import { getDataImports } from '@/app/actions/settings'

export default async function ImportPage() {
  const imports = await getDataImports()

  return (
    <div className="flex flex-col">
      <Header
        title="Importera data"
        description="Ladda upp och importera fordon från Excel- eller CSV-filer"
      />

      <div className="flex-1 p-6 space-y-8 max-w-4xl mx-auto w-full">
        {/* Import Wizard */}
        <ImportWizard />

        {/* Data Import Tracker */}
        <DataImportTracker imports={imports} />
      </div>
    </div>
  )
}
