/**
 * WoDX fork: the Group actor (coterie, pack, cabal, motley, cell, court...).
 * Data only. The sheet lives in the WoDX Creation module; the system's own character code skips this type.
 */
export const GROUP_KINDS = {
    coterie: "Coterie (Vampire)",
    pack: "Pack (Werewolf and Fera)",
    cabal: "Cabal (Mage)",
    motley: "Motley (Changeling)",
    circle: "Circle (Wraith)",
    cell: "Cell (Hunter)",
    court: "Court (Demon)",
    amenti: "Amenti (Mummy)",
    wu: "Wu (Kindred of the East)",
    crucible: "Crucible (Orpheus)",
    household: "Household or retinue (mortals)",
    other: "Other"
};

export default class GroupDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const f = foundry.data.fields;
        return {
            kind: new f.StringField({required: true, blank: false, initial: "coterie", choices: Object.keys(GROUP_KINDS)}),
            era: new f.StringField({required: true, blank: true, initial: ""}),
            roster: new f.ArrayField(new f.SchemaField({
                actorId: new f.StringField({required: true, blank: false}),
                role: new f.StringField({required: true, blank: true, initial: ""}),
                joined: new f.NumberField({required: false, nullable: true, initial: null}),
                left: new f.NumberField({required: false, nullable: true, initial: null})
            })),
            backgrounds: new f.ArrayField(new f.SchemaField({
                id: new f.StringField({required: true, blank: false}),
                name: new f.StringField({required: true, blank: false}),
                note: new f.StringField({required: true, blank: true, initial: ""}),
                // Background dots each member puts in: {actorId: dots}
                contributions: new f.ObjectField({initial: {}})
            })),
            // The Anchor: no pooled Background may have more dots (V20 Dark Ages p. 182)
            anchorId: new f.StringField({required: true, blank: true, initial: ""}),
            notes: new f.HTMLField({required: true, blank: true, initial: ""}),
            settings: new f.SchemaField({
                iscreated: new f.BooleanField({initial: true}),
                version: new f.StringField({required: true, blank: true, initial: ""})
            })
        };
    }
}
