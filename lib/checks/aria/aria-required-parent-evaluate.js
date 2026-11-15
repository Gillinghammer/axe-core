import { getExplicitRole, getRole, requiredContext } from '../../commons/aria';
import {
  getRootNode,
  isFocusable,
  isNativelyFocusable
} from '../../commons/dom';
import { getGlobalAriaAttrs } from '../../commons/standards';
import { getNodeFromTree, escapeSelector } from '../../core/utils';

const PRESENTATIONAL_ROLES = ['presentation', 'none'];

/**
 * Find the required parent roles that are missing from the ancestors of an
 * element.
 * @param {VirtualNode} virtualNode
 * @param {String[]} ownGroupRoles
 * @param {String[]} [reqContext] - Required parent roles still missing
 * @param {Boolean} [includeElement] - Start looking at the element itself
 * @return {Object|null} `null` when a required parent is present, otherwise
 * the missing roles (`missing`) and the ancestor with a role that stopped the
 * search (`blockingNode`)
 */
function getMissingContext(
  virtualNode,
  ownGroupRoles,
  reqContext,
  includeElement
) {
  const explicitRole = getExplicitRole(virtualNode);

  if (!reqContext) {
    reqContext = requiredContext(explicitRole);
  }

  if (!reqContext) {
    return null;
  }

  const allowsGroup = reqContext.includes('group');
  let vNode = includeElement ? virtualNode : virtualNode.parent;

  while (vNode) {
    const role = getRole(vNode, { noPresentational: true });

    // if parent node has no role or is presentational, or if role
    // allows group, we keep parsing the parent tree.
    // this means intermediate roles between a required parent and
    // child will fail the check
    if (!role) {
      vNode = vNode.parent;
    } else if (role === 'group' && allowsGroup) {
      // Allow the own role; i.e. tree > treeitem > group > treeitem
      if (ownGroupRoles.includes(explicitRole)) {
        reqContext.push(explicitRole);
      }
      reqContext = reqContext.filter(r => r !== 'group');
      vNode = vNode.parent;
    } else if (reqContext.includes(role)) {
      return null;
    } else {
      return { missing: reqContext, blockingNode: vNode };
    }
  }

  return { missing: reqContext, blockingNode: null };
}

/**
 * List the attributes that stop the presentational role of an element from
 * being applied, so that its implicit role is used instead. A natively
 * focusable element has none, since removing attributes would not make its
 * presentational role apply.
 * @param {VirtualNode|null} vNode
 * @return {String[]}
 */
function getPresentationalConflictAttrs(vNode) {
  if (
    !vNode ||
    !PRESENTATIONAL_ROLES.includes(getExplicitRole(vNode)) ||
    isNativelyFocusable(vNode)
  ) {
    return [];
  }

  const attrs = getGlobalAriaAttrs().filter(attr => vNode.hasAttr(attr));
  if (vNode.hasAttr('tabindex') && isFocusable(vNode)) {
    attrs.unshift('tabindex');
  }
  return attrs;
}

function getAriaOwners(element) {
  const owners = [];
  let o = null;

  while (element) {
    if (element.getAttribute('id')) {
      const id = escapeSelector(element.getAttribute('id'));
      const doc = getRootNode(element);
      o = doc.querySelector(`[aria-owns~=${id}]`);
      if (o) {
        owners.push(o);
      }
    }
    element = element.parentElement;
  }

  return owners.length ? owners : null;
}

/**
 * Check if the element has a parent with a required role.
 *
 * Required parent roles are taken from the `ariaRoles` standards object from the roles `requiredContext` property.
 *
 * ##### Data:
 * <table class="props">
 *   <thead>
 *     <tr>
 *       <th>Type</th>
 *       <th>Description</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr>
 *       <td><code>String[]</code></td>
 *       <td>List of all missing required parent roles</td>
 *     </tr>
 *     <tr>
 *       <td><code>Object</code></td>
 *       <td>When an ancestor's presentational role is ignored: <code>messageKey</code>,
 *       the missing roles (<code>values</code>), the ancestor's <code>role</code>
 *       and the attributes that stop it from being ignored (<code>attrs</code>)</td>
 *     </tr>
 *   </tbody>
 * </table>
 *
 * @memberof checks
 * @return {Boolean} True if the element has a parent with a required role. False otherwise.
 */
function ariaRequiredParentEvaluate(node, options, virtualNode) {
  const ownGroupRoles =
    options && Array.isArray(options.ownGroupRoles)
      ? options.ownGroupRoles
      : [];
  let missingContext = getMissingContext(virtualNode, ownGroupRoles);

  if (!missingContext) {
    return true;
  }
  const owners = getAriaOwners(node);
  if (owners) {
    for (let i = 0, l = owners.length; i < l; i++) {
      missingContext = getMissingContext(
        getNodeFromTree(owners[i]),
        ownGroupRoles,
        missingContext.missing,
        true
      );
      if (!missingContext) {
        return true;
      }
    }
  }

  const { missing, blockingNode } = missingContext;
  // Explain when the required parent is only missing because an attribute
  // stops an ancestor's presentational role from being applied
  // @see https://github.com/dequelabs/axe-core/issues/3495
  const conflictAttrs = getPresentationalConflictAttrs(blockingNode);
  if (conflictAttrs.length) {
    this.data({
      messageKey:
        missing.length === 1
          ? 'presentationalSingular'
          : 'presentationalPlural',
      values: missing,
      role: getExplicitRole(blockingNode),
      attrs: conflictAttrs.map(attr => `[${attr}]`).join(', ')
    });
    return false;
  }

  this.data(missing);
  return false;
}

export default ariaRequiredParentEvaluate;
