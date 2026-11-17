# Street layout ported from the Medieval Fantasy City Generator

`layout.py` is a Python port of the layout steps of Oleg Dolya's Medieval Fantasy City Generator
(https://github.com/watabou/TownGeneratorOS). That source is licensed under the GNU General Public License,
version 3 (https://www.gnu.org/licenses/gpl-3.0.html). The port follows the original step for step (patches,
junctions, the wall and its gates, streets and roads, wards), so it is a derivative work and keeps the same licence.
`organic.py` builds its street plan on `layout.py` and is covered by the same terms where it uses that code.

Earlier notes called the source CC0. That was wrong: the source repository carries GPL-3.0 (checked 15 November
2026, B6510).

The buildings, furnishing and everything else in `tools/mapgen` are WoDX's own and are not part of this port.
