-- AlterTable
ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProductCategories_AB_unique";
