/**
 * WoDX Library: every line that can make supernatural items registers its kit here (B3683). One import a line; each
 * file calls registerLine() from wonder-registry.mjs. Library main imports this once, registers each kit's world
 * setting, and exposes the registry on api.wonders.
 */
import "./wonders-garou.mjs";
import "./wonders-mage.mjs";
